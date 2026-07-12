// Product analytics via PostHog (EU cloud). Captures the BRD §16 success measures:
// unique users, sessions, tours completed, story-card views, audio plays, and
// wiki / further-reading click-through.
//
// posthog-js is loaded with a dynamic import so it lands in its own chunk and does
// not bloat the initial app bundle. The PostHog project token is a public,
// write-only client key (safe in the frontend). Honours the browser's "Do Not
// Track" signal: if DNT is on, analytics is never initialised.

import { config } from '../config.js'

const KEY = config.posthogKey
// Send events FIRST-PARTY through the app's own domain (`/ingest`, a Vercel rewrite
// to PostHog EU — see vercel.json) so tracker-blockers and Safari ITP don't drop
// them; this is the single biggest lever on capture rate. Falls back to the direct
// host if a deployment explicitly sets VITE_POSTHOG_HOST, or off-browser.
const HOST =
  typeof window !== 'undefined' && !import.meta.env.VITE_POSTHOG_HOST
    ? `${window.location.origin}/ingest`
    : config.posthogHost

const dnt =
  typeof navigator !== 'undefined' &&
  (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1')

export const analyticsEnabled = Boolean(KEY) && !dnt

const OPTOUT_KEY = 'nearmark-analytics-optout'
export function isOptedOut() {
  try { return localStorage.getItem(OPTOUT_KEY) === '1' } catch { return false }
}

let posthog = null
const queue = [] // events fired before posthog finished loading

export async function initAnalytics() {
  if (!analyticsEnabled || posthog) return
  const mod = await import('posthog-js')
  posthog = mod.default
  posthog.init(KEY, {
    api_host: HOST,
    ui_host: 'https://eu.posthog.com',           // events proxy through /ingest; toolbar/links still resolve to the cloud
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',                 // cookie-free (no cookies set)
    person_profiles: 'identified_only',          // anonymous unless explicitly identified (we never identify)
    opt_out_capturing_by_default: isOptedOut(),  // honour a saved opt-out from the Settings toggle
  })
  for (const [event, props] of queue.splice(0)) posthog.capture(event, props)
}

export function track(event, props) {
  if (!analyticsEnabled || isOptedOut()) return
  if (posthog) posthog.capture(event, props)
  else queue.push([event, props]) // buffer until the chunk loads
}

// opt-out toggle for the Settings screen – persists the choice and applies it live
export function setAnalyticsOptOut(optedOut) {
  try { localStorage.setItem(OPTOUT_KEY, optedOut ? '1' : '0') } catch { /* ignore */ }
  if (!posthog) return
  if (optedOut) posthog.opt_out_capturing()
  else posthog.opt_in_capturing()
}
