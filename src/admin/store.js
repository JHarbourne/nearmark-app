// Admin backoffice store – Supabase backend (auth + database + storage).
// Login is real email/password via Supabase Auth (session persisted by the
// client; no tokens to paste). All writes go through the authenticated session
// and are enforced by Row Level Security.

import { reactive } from 'vue'
import { supabaseConfigured, db, auth, uploadMedia, replaceMediaFile, removeMedia, listStorageMedia, listMediaMeta, saveMediaMeta, deleteMediaAsset, computeWalkingRoute } from '../lib/supabase.js'
import { compressImage } from '../lib/image.js'

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
  loading: false,
  error: '',
  activity: [],
  editors: [],
  role: null, // RBAC role of the signed-in user ('super_admin'|'editor'); null = no RBAC on this project (pre-migration) → full access, as before

  // ── RBAC gates: mirror the migration-030 RLS so the UI never offers an action the
  // DB will reject. role === null → no RBAC here → everything allowed (unchanged).
  get isEditor() { return this.role === 'editor' },
  get isSuperAdmin() { return this.role === 'super_admin' },
  canEditTour(tour) { return this.role !== 'editor' || tour?.createdBy === this.user?.id },      // tours: owner + SA only
  canDeleteTour(tour) { return this.canEditTour(tour) },
  canDeleteLocation(loc) { return this.role !== 'editor' || loc?.createdBy === this.user?.id },   // locations: anyone edits, owner/SA delete

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
      this.locations = locs
      this.tours = trs
      if (this.liveBackend) this.role = await db.myRole().catch(() => null)
    } catch (e) {
      this.error = e.message
    } finally {
      this.loading = false
    }
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
  async deleteLocation(loc) {
    if (loc.recordId) await db.deleteLocation(loc.recordId)
    this.logActivity('Deleted location', loc.title)
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
    if (tour.recordId) await db.deleteTour(tour.recordId)
    this.logActivity('Deleted tour', tour.title)
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
