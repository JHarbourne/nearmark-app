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

  locations: [],
  tours: [],
  loading: false,
  error: '',
  activity: [],

  // ── session ──
  async init() {
    if (!supabaseConfigured) return
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
  go(route, params = {}) {
    if (this.dirtyCheck && this.dirtyCheck()) {
      if (typeof window !== 'undefined' && !window.confirm('You have unsaved changes on this page. Leave without saving?')) return
      this.dirtyCheck = null
    }
    this.route = route
    this.params = params
  },
  registerDirtyCheck(fn) { this.dirtyCheck = fn },
  clearDirtyCheck() { this.dirtyCheck = null },

  // ── data ──
  async load() {
    this.loading = true
    this.error = ''
    try {
      const [locs, trs] = await Promise.all([db.listLocations(), db.listTours()])
      this.locations = locs
      this.tours = trs
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
