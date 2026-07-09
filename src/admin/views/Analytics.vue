<!-- Analytics screen. If a PostHog shared-dashboard embed URL is configured
     (VITE_ANALYTICS_EMBED_URL), it's shown inline; otherwise this links out to
     PostHog. All app analytics (page views + product events) run on PostHog EU. -->
<template>
  <div class="analytics" :class="{ embedded: embedUrl }">
    <div class="pagehead" style="flex-shrink:0;">
      <h1>Analytics</h1>
      <a v-if="analyticsUrl" :href="analyticsUrl" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">
        Open in PostHog<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:6px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
      </a>
    </div>

    <!-- embedded PostHog dashboard -->
    <div v-if="embedUrl" class="embed-wrap">
      <iframe :src="embedUrl" title="Analytics dashboard" loading="lazy" allowfullscreen></iframe>
    </div>

    <!-- no embed configured: explain + link out -->
    <div v-else class="card" style="padding:24px; max-width:640px;">
      <p style="margin:0 0 12px; font-size:15px;">
        This app's analytics run on <strong>PostHog</strong> (EU) — page views and product events
        (tours started/completed, story views, audio plays, link clicks).
      </p>
      <template v-if="analyticsUrl">
        <a :href="analyticsUrl" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none;">
          Open PostHog analytics<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:6px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </a>
        <p class="muted" style="font-size:13px; line-height:1.6; margin:18px 0 0;">
          <strong>Want it embedded here?</strong> In PostHog, open a dashboard → <em>Share</em> →
          enable sharing → copy the <em>Embed</em> URL, and set it as
          <code>VITE_ANALYTICS_EMBED_URL</code> in this app's Vercel environment.
        </p>
      </template>
      <p v-else class="muted" style="font-size:13.5px; line-height:1.7; margin:0;">
        No analytics key is configured for this deployment. Set <code>VITE_POSTHOG_KEY</code>
        (and optionally <code>VITE_ANALYTICS_URL</code>) in Vercel to enable it.
      </p>
    </div>
  </div>
</template>

<script setup>
import { config } from '../../config.js'
const analyticsUrl = config.analyticsUrl
const embedUrl = config.analyticsEmbedUrl
</script>

<style scoped>
/* When embedding, fill the viewport so the dashboard has room (like the Dashboard
   screen). `.main` has 28px top + 64px bottom padding on desktop (= 92px). */
.analytics.embedded { display: flex; flex-direction: column; height: calc(100dvh - 92px); }
.embed-wrap { flex: 1; min-height: 0; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff; }
.embed-wrap iframe { width: 100%; height: 100%; border: 0; display: block; }
@media (max-width: 860px) {
  .analytics.embedded { height: auto; }
  .embed-wrap { height: 70vh; }
}
</style>
