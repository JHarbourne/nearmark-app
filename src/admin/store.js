// Admin backoffice store – Supabase backend (auth + database + storage).
// Login is real email/password via Supabase Auth (session persisted by the
// client; no tokens to paste). All writes go through the authenticated session
// and are enforced by Row Level Security.

import { reactive } from 'vue'
import { supabaseConfigured, db, auth, uploadMedia, replaceMediaFile, removeMedia, listStorageMedia, listMediaMeta, saveMediaMeta, deleteMediaAsset, computeWalkingRoute } from '../lib/supabase.js'
import { compressImage } from '../lib/image.js'
import { config } from '../config.js'

// A project that hasn't run migration 040 has no request_delete/restore RPCs;
// PostgREST reports that as a "schema cache" / "Could not find the function" error.
// We fall back to the pre-040 hard delete in that one case, and rethrow anything else.
const isMissingRpc = (e) => /Could not find the function|schema cache|does not exist/i.test(e?.message || '')

export const store = reactive({
  liveBackend: supabaseConfigured,
  authed: false,
  user: null,
  mfaPending: false,   // password accepted, awaiting authenticator code
  mfaFactorId: null,
  recoveryMode: false, // arrived via a password-reset link; show "set new password"
  recoveryNeedsMfa: false, // that account has 2FA, so the reset needs an authenticator code first

  route: 'dashboard',
  params: {},
  dirtyCheck: null, // editors register a () => boolean here; go() confirms before leaving
  dirtySave: null,  // editors also register their async save() so the guard can offer "Save"
  pendingNav: null, // { route, params } of a navigation awaiting the unsaved-changes choice

  locations: [],
  tours: [],
  archivedLocations: [], // soft-archived (migration 040), kept out of the working lists
  archivedTours: [],
  deletionRequests: [],  // pending requests I can decide (owner or SA); [] pre-migration-040
  announcements: [], // "What's on" event cards (migration 038); [] where the table isn't there
  approvals: [], // per-story owner-approval records (participatory tours); empty where the participants table isn't used
  craftFairSignups: [], // Christmas Craft Fair stall bookings (Tollesbury only); [] where the table isn't present
  craftFairEnabled: false, // true only where craft_fair_signups exists (Tollesbury) → shows the nav item
  loading: false,
  error: '',
  activity: [],
  editors: [],
  role: null, // RBAC role of the signed-in user ('super_admin'|'editor'); null = no RBAC on this project (pre-migration) → full access, as before
  myTourIds: [], // tour record-ids this editor is assigned to (migration 036); [] for SA / pre-migration
  notifications: [], // in-app notification feed (migration 031); empty where the table isn't there

  // ── RBAC gates: mirror the migration-030/036 RLS so the UI never offers an action the
  // DB will reject. role === null → no RBAC here → everything allowed (unchanged).
  // Scoping (036): an editor edits only locations/stories they OWN, and edits a tour they
  // OWN or are ASSIGNED to; delete stays owner + SA. A location the SA shares into their
  // tour is visible but read-only. The Super Admin can do everything.
  get isEditor() { return this.role === 'editor' },
  get isSuperAdmin() { return this.role === 'super_admin' },
  get unreadCount() { return this.notifications.filter((n) => !n.readAt).length },
  // owner + SA + any assigned editor whose tour this location is a stop in (migration 037)
  canEditLocation(loc) {
    if (this.role !== 'editor') return true
    if (loc?.createdBy === this.user?.id) return true
    return this.tours.some((t) => this.myTourIds.includes(t.recordId) && (t.stopIds || []).includes(loc?.id))
  },
  canDeleteLocation(loc) { return this.role !== 'editor' || loc?.createdBy === this.user?.id },    // owner + SA only (delete stays strict)
  canEditStory(loc) { return this.canEditLocation(loc) },                                         // follows the parent location
  canEditTour(tour) { return this.role !== 'editor' || tour?.createdBy === this.user?.id || this.myTourIds.includes(tour?.recordId) }, // owner + assigned + SA
  canDeleteTour(tour) { return this.role !== 'editor' || tour?.createdBy === this.user?.id },     // owner + SA only (not assigned)
  // Where a NEW location/tour map should open: the centre of the locations this
  // deployment already covers (so it lands on Tollesbury, London, … automatically),
  // falling back to the configured default only when there's no content yet.
  get defaultMapCenter() {
    const pts = this.locations.filter((l) => l.lat != null && l.lng != null)
    if (!pts.length) return config.mapCenter
    return {
      lat: pts.reduce((s, l) => s + l.lat, 0) / pts.length,
      lng: pts.reduce((s, l) => s + l.lng, 0) / pts.length,
    }
  },
  // Combined "Tours & events" list — tours and announcements share one sort_order
  // space (lower = higher up), driving both this admin list and the public home order.
  get homeItems() {
    const rows = [
      ...this.tours.map((t) => ({ type: 'tour', item: t })),
      ...this.announcements.map((a) => ({ type: 'event', item: a })),
    ]
    return rows.sort((x, y) => ((x.item.sortOrder ?? 0) - (y.item.sortOrder ?? 0))
      || (x.type === y.type ? 0 : x.type === 'event' ? -1 : 1)
      || (x.item.title || '').localeCompare(y.item.title || ''))
  },
  // Persist the given combined order: each row's index becomes its sort_order,
  // written to whichever table it belongs to. Updates local state so the list re-sorts.
  async reorderHome(ordered) {
    ordered.forEach((row, i) => { row.item.sortOrder = i })
    await Promise.all(ordered.map((row, i) =>
      row.type === 'tour' ? db.setTourOrder(row.item.recordId, i) : db.setAnnouncementOrder(row.item.recordId, i)))
    this.logActivity('Reordered tours & events', '')
  },
  async refreshNotifications() { if (this.liveBackend) this.notifications = await db.listNotifications().catch(() => []) },
  async markNotificationsRead() {
    await db.markNotificationsRead().catch(() => {})
    this.notifications = this.notifications.map((n) => (n.readAt ? n : { ...n, readAt: new Date() }))
  },

  // ── session ──
  async init() {
    if (!supabaseConfigured) {
      // No backend configured (the seed / OSS-demo build): let the admin be browsed
      // read-only without a login, so people can explore it — and the a11y tests can
      // scan it. Saves are no-ops here; the demo banner explains why. In production
      // Supabase is always configured, so a real login is always required.
      this.authed = true
      this.user = { email: 'Demo (read-only)' }
      await this.load()
      return
    }
    // Listen first so we catch the PASSWORD_RECOVERY event the Supabase client
    // fires after parsing a reset link's URL hash.
    auth.onChange((user, event) => {
      if (event === 'PASSWORD_RECOVERY') { this.recoveryMode = true; this.user = user; this.authed = false; this.mfaPending = false; return }
      this.user = user
      if (!user) { this.authed = false; this.mfaPending = false; this.route = 'dashboard'; this.locations = []; this.tours = [] }
    })
    // Also detect the recovery link directly, in case the hash is read before
    // the listener fires; recovery takes precedence over auto-login.
    if (typeof window !== 'undefined' && /(?:^|[#&])type=(recovery|invite)/.test(window.location.hash)) this.recoveryMode = true
    this.user = await auth.getUser().catch(() => null)
    if (this.user && !this.recoveryMode) {
      if (await this.mfaRequired()) { this.mfaPending = true; this.authed = false }
      else { this.authed = true; await this.load() }
    }
  },
  // True only when the account has a *verified* authenticator that this session
  // hasn't satisfied yet. Never throws – on any error we treat MFA as not
  // required, so a problem here can never lock anyone out of signing in.
  async mfaRequired() {
    try {
      const { data } = await auth.mfaAAL()
      if (!data || data.nextLevel !== 'aal2' || data.currentLevel === 'aal2') return false
      const { data: f } = await auth.mfaList()
      const totp = (f?.totp || []).find((x) => x.status === 'verified')
      this.mfaFactorId = totp?.id || null
      return !!this.mfaFactorId
    } catch { return false }
  },
  async signIn(email, password) {
    const { data, error } = await auth.signIn(email, password)
    if (error) {
      // surface the actionable reason (e.g. "Email not confirmed") rather than a
      // blanket message; Supabase already returns a generic string for bad creds.
      return { ok: false, message: error.message || 'Could not sign in' }
    }
    this.user = data.user
    if (await this.mfaRequired()) { this.mfaPending = true; return { ok: true, mfa: true } }
    this.authed = true
    await this.load()
    return { ok: true }
  },
  async verifyMfa(code) {
    if (!this.mfaFactorId) return { ok: false, message: 'No authenticator is set up.' }
    const { error } = await auth.mfaVerify(this.mfaFactorId, code)
    if (error) return { ok: false, message: error.message || 'Invalid code – try again.' }
    this.mfaPending = false
    this.authed = true
    await this.load()
    return { ok: true }
  },
  async signOut() {
    await auth.signOut()
    this.authed = false
    this.user = null
    this.mfaPending = false
    this.recoveryMode = false
  },
  resetPassword(email) { return auth.resetPassword(email) },
  // After arriving on the recovery screen, work out whether the account has a
  // verified authenticator. If so, Supabase requires an AAL2 session to change
  // the password, so the form must collect a 2FA code first.
  async checkRecoveryMfa() {
    try {
      const { data } = await auth.mfaList()
      const totp = (data?.totp || []).find((x) => x.status === 'verified')
      this.mfaFactorId = totp?.id || null
      this.recoveryNeedsMfa = !!this.mfaFactorId
    } catch { this.recoveryNeedsMfa = false }
    return this.recoveryNeedsMfa
  },
  // Called from the recovery "set new password" form: elevate to AAL2 with the
  // authenticator code if 2FA is on, update the password, then drop straight
  // into the dashboard.
  async setNewPassword(password, code) {
    if (this.recoveryNeedsMfa) {
      if (!code) return { ok: false, message: 'Enter your authenticator code.' }
      const { error: mfaErr } = await auth.mfaVerify(this.mfaFactorId, code)
      if (mfaErr) return { ok: false, message: mfaErr.message || 'Invalid authenticator code – try again.' }
    }
    const { error } = await auth.updateUser({ password })
    if (error) return { ok: false, message: error.message || 'Could not set the password.' }
    this.recoveryMode = false
    this.recoveryNeedsMfa = false
    // strip the recovery tokens from the URL so a refresh doesn't re-trigger it
    if (typeof window !== 'undefined' && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    this.authed = true
    await this.load()
    return { ok: true }
  },

  // ── MFA enrolment (Security card in User management) ──
  listMfaFactors: () => auth.mfaList(),
  async enrollMfa(name) {
    const { data, error } = await auth.mfaEnroll(name || 'Authenticator app')
    if (error) throw new Error(error.message)
    return data // { id, totp: { qr_code, secret, uri } }
  },
  async confirmMfa(factorId, code) {
    const { error } = await auth.mfaVerify(factorId, code)
    if (error) throw new Error(error.message)
  },
  async removeMfa(factorId) {
    const { error } = await auth.mfaUnenroll(factorId)
    if (error) throw new Error(error.message)
  },

  // ── routing (with an unsaved-changes guard) ──
  // When the current editor is dirty, don't navigate immediately: open the
  // Save / Don't save / Cancel dialog (rendered by AdminApp) and stash where we
  // were headed. The dialog's buttons resolve via navSave/navDiscard/navCancel.
  go(route, params = {}) {
    if (this.dirtyCheck && this.dirtyCheck()) {
      this.pendingNav = { route, params }
      return
    }
    this._navigate(route, params)
  },
  _navigate(route, params) {
    this.dirtyCheck = null
    this.dirtySave = null
    this.route = route
    this.params = params
  },
  registerDirtyCheck(fn, save = null) { this.dirtyCheck = fn; this.dirtySave = save },
  clearDirtyCheck() { this.dirtyCheck = null; this.dirtySave = null },

  // ── unsaved-changes dialog actions ──
  async navSave() {
    const nav = this.pendingNav
    if (!nav) return
    if (this.dirtySave) {
      try { await this.dirtySave() } catch (e) { this.pendingNav = null; alert('Save failed: ' + (e?.message || e)); return }
    }
    // If the save didn't clear the dirty state (e.g. it hit a validation alert),
    // stay on the page so it can be fixed rather than silently leaving.
    if (this.dirtyCheck && this.dirtyCheck()) { this.pendingNav = null; return }
    this.pendingNav = null
    this._navigate(nav.route, nav.params)
  },
  navDiscard() {
    const nav = this.pendingNav
    this.pendingNav = null
    if (nav) this._navigate(nav.route, nav.params)
  },
  navCancel() { this.pendingNav = null },

  // ── data ──
  async load() {
    this.loading = true
    this.error = ''
    try {
      const [locs, trs] = await Promise.all([db.listLocations(), db.listTours()])
      // Split off soft-archived rows (migration 040) so they never appear in the
      // working lists, map/stop pickers or the public home order. archivedAt is
      // always null on a project without the migration → everything stays live.
      this.locations = locs.filter((l) => !l.archivedAt)
      this.archivedLocations = locs.filter((l) => l.archivedAt)
      this.tours = trs.filter((t) => !t.archivedAt)
      this.archivedTours = trs.filter((t) => t.archivedAt)
      if (this.liveBackend) {
        this.role = await db.myRole().catch(() => null)
        this.myTourIds = this.role === 'editor' ? await db.myTourIds().catch(() => []) : []
        this.notifications = await db.listNotifications().catch(() => [])
        this.deletionRequests = await db.listDeletionRequests().catch(() => [])
        this.approvals = await db.listApprovals().catch(() => [])
        this.announcements = await db.listAnnouncements().catch(() => [])
        // Craft Fair bookings: success (even []) means the table exists → show the screen;
        // an error means this deployment has no such table → keep it hidden.
        try { this.craftFairSignups = await db.listCraftFairSignups(); this.craftFairEnabled = true }
        catch { this.craftFairSignups = []; this.craftFairEnabled = false }
      }
    } catch (e) {
      this.error = e.message
    } finally {
      this.loading = false
    }
  },
  // Re-pull just the owner-approval records (e.g. when the Approvals screen opens),
  // so a fresh approval shows without a full reload. Safe no-op off a live backend.
  async loadApprovals() {
    if (!this.liveBackend) { this.approvals = []; return }
    try { this.approvals = await db.listApprovals() } catch { /* keep what we have */ }
  },
  // Re-pull Craft Fair bookings (e.g. when that screen opens). Tollesbury only.
  async loadCraftFairSignups() {
    if (!this.liveBackend) { this.craftFairSignups = []; return }
    try { this.craftFairSignups = await db.listCraftFairSignups(); this.craftFairEnabled = true } catch { /* keep what we have */ }
  },
  // Mark a booking paid / awaiting: update the DB, then the local row so the UI reflects it.
  async setCraftFairPaid(id, paid) {
    const status = paid ? 'paid' : 'awaiting'
    await db.setCraftFairPaymentStatus(id, status)
    const row = this.craftFairSignups.find((r) => r.id === id)
    if (row) row.payment_status = status
  },
  logActivity(action, title) {
    this.activity.unshift({ action, title, who: this.user?.email || 'admin', at: new Date() })
    this.activity = this.activity.slice(0, 20)
    // persist to the shared activity_log (migration 018) so the feed survives
    // refreshes and shows other admins' actions – best-effort, never blocks a save
    if (supabaseConfigured) Promise.resolve(db.logActivity(action, title, this.user?.email)).catch(() => {})
  },
  // pull the durable feed (all admins) – called when the Dashboard opens
  async loadActivity() {
    if (!supabaseConfigured) return
    try { this.activity = await db.recentActivity(20) } catch { /* keep the in-memory feed */ }
  },
  // edits-per-editor summary for the Dashboard chart
  async loadEditorStats() {
    if (!supabaseConfigured) { this.editors = []; return }
    try { this.editors = await db.editorStats() } catch { /* leave as-is */ }
  },

  // ── writes ──
  async saveLocation(loc) {
    if (loc.recordId) await db.updateLocation(loc.recordId, loc)
    else await db.createLocation(loc)
    this.logActivity(loc.recordId ? 'Updated location' : 'Created location', loc.title)
    await this.load()
  },
  // "Delete" is now a soft-archive (migration 040): owner/SA → archived (recoverable);
  // a non-owner assigned editor → a request the owner approves. Returns 'archived' |
  // 'requested' so the caller can toast the right thing. Falls back to the old hard
  // delete on a project without the deletion-workflow migration.
  async deleteLocation(loc) {
    if (!loc.recordId) return 'archived'
    const result = await this._removeEntity('location', loc.recordId)
    this.logActivity(result === 'requested' ? 'Requested location deletion' : 'Archived location', loc.title)
    await this.load()
    return result
  },
  async _removeEntity(type, recordId) {
    try { return await db.requestDelete(type, recordId) }
    catch (e) {
      if (!isMissingRpc(e)) throw e
      // pre-migration-040 project: keep the original behaviour (a real delete)
      if (type === 'location') await db.deleteLocation(recordId)
      else await db.deleteTour(recordId)
      return 'archived'
    }
  },
  // Owner or SA brings an archived row back to life.
  async restoreLocation(loc) {
    await db.restoreEntity('location', loc.recordId)
    this.logActivity('Restored location', loc.title)
    await this.load()
  },
  async restoreTour(tour) {
    await db.restoreEntity('tour', tour.recordId)
    this.logActivity('Restored tour', tour.title)
    await this.load()
  },
  // Super Admin only: a permanent, unrecoverable delete of an archived row.
  async purgeLocation(loc) {
    await db.deleteLocation(loc.recordId)
    this.logActivity('Purged location', loc.title)
    await this.load()
  },
  async purgeTour(tour) {
    await db.deleteTour(tour.recordId)
    this.logActivity('Purged tour', tour.title)
    await this.load()
  },
  // Owner/SA approves or declines a pending deletion request (from the bell or Archive).
  async resolveDeletion(requestId, approve) {
    await db.resolveDeletion(requestId, approve)
    await this.load()
  },
  // ── stories (content) ──
  async saveStory(story) {
    let saved
    if (story.storyId) saved = await db.updateStory(story.storyId, story)
    else saved = await db.createStory(story)
    this.logActivity(story.storyId ? 'Updated story' : 'Created story', story.heading)
    await this.load()
    return Array.isArray(saved) ? saved[0] : saved
  },
  async deleteStory(story) {
    if (story.storyId) await db.deleteStory(story.storyId)
    this.logActivity('Deleted story', story.heading)
    await this.load()
  },
  // Move a saved story to another location (reassigns location_id). Its content and
  // its owner/approval record travel with it. Placed at the end of the target.
  async moveStory(story, toLocationRecordId) {
    if (!story.storyId || !toLocationRecordId) return
    const target = this.locations.find((l) => l.recordId === toLocationRecordId)
    const nextOrder = (target?.stories || []).reduce((m, s) => Math.max(m, s.sortOrder || 0), 0) + 1
    await db.moveStory(story.storyId, toLocationRecordId, nextOrder)
    this.logActivity('Moved story', `${story.heading} → ${target?.title || 'another location'}`)
    await this.load()
  },
  // ── participants (private per-story owner contact; migration 032) ──
  // Defensive: a missing participants table (pre-migration project) returns null
  // and never blocks a story save.
  async getParticipant(storyId) {
    if (!storyId) return null
    try { return await db.getParticipant(storyId) } catch { return null }
  },
  async saveParticipant(storyId, contact) {
    if (!storyId) return null
    const saved = await db.saveParticipant(storyId, contact)
    return Array.isArray(saved) ? saved[0] : saved
  },
  // persist the given order as sort_order (1-based; lower = higher up)
  async reorderStories(stories) {
    await Promise.all(stories.map((s, i) => (s.storyId ? db.setStoryOrder(s.storyId, i + 1) : null)))
    this.logActivity('Reordered stories', '')
    await this.load()
  },
  async saveTour(tour) {
    if (tour.recordId) await db.updateTour(tour.recordId, tour)
    else await db.createTour(tour)
    this.logActivity(tour.recordId ? 'Updated tour' : 'Created tour', tour.title)
    await this.load()
  },
  async deleteTour(tour) {
    if (!tour.recordId) return 'archived'
    const result = await this._removeEntity('tour', tour.recordId)
    this.logActivity(result === 'requested' ? 'Requested tour deletion' : 'Archived tour', tour.title)
    await this.load()
    return result
  },
  // ── announcements ("What's on"), migration 038 ──
  async saveAnnouncement(a) {
    if (a.recordId) await db.updateAnnouncement(a.recordId, a)
    else await db.createAnnouncement(a)
    this.logActivity(a.recordId ? 'Updated announcement' : 'Created announcement', a.title)
    await this.load()
  },
  async deleteAnnouncement(a) {
    if (a.recordId) await db.deleteAnnouncement(a.recordId)
    this.logActivity('Deleted announcement', a.title)
    await this.load()
  },
  // persist the current order of this.tours as sort_order (lower = higher up)
  async reorderTours() {
    await Promise.all(this.tours.map((t, i) => {
      t.sortOrder = i
      return t.recordId ? db.setTourOrder(t.recordId, i) : null
    }))
    this.logActivity('Reordered tours', '')
  },

  // ── storage uploads (images are optimised client-side before upload) ──
  async upload(file, kind) {
    const f = kind === 'image' ? await compressImage(file) : file
    return uploadMedia(f, kind)
  },
  // Swap an existing asset's bytes in place (same path/URL) so it updates on
  // every page that uses it. Images are optimised first, like uploads.
  async replaceMedia(asset, file) {
    const isImage = asset.type === 'image' || (file.type || '').startsWith('image')
    const f = isImage ? await compressImage(file) : file
    const url = await replaceMediaFile(asset.path, f)
    this.logActivity('Replaced media', asset.filename || asset.defaultName)
    return url
  },
  removeMedia(url) { return removeMedia(url) },
  // road-following walking route via the compute-route Edge Function
  computeRoute(coordinates) { return computeWalkingRoute(coordinates) },

  // ── media library ──
  media: [],
  async loadMedia() {
    const [files, meta] = await Promise.all([listStorageMedia(), listMediaMeta()])
    const byUrl = Object.fromEntries(meta.map((m) => [m.storage_url, m]))
    this.media = files.map((f) => {
      const m = byUrl[f.url] || {}
      return {
        ...f,
        filename: m.filename || f.defaultName,
        photographer: m.photographer || '',
        license: m.license || '',
        caption: m.caption || '',
      }
    })
  },
  async saveMediaMeta(asset) {
    await saveMediaMeta(asset)
    this.logActivity('Updated media', asset.filename || asset.defaultName)
  },
  async deleteMediaAsset(asset) {
    await deleteMediaAsset(asset.path, asset.url)
    this.media = this.media.filter((m) => m.url !== asset.url)
    this.logActivity('Deleted media', asset.filename || asset.defaultName)
  },
})
