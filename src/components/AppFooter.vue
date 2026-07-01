<!-- Shared footer credit: "Content from {source}. Powered by {platform}." -->
<template>
  <p style="font-size: 11px; color: var(--ink-faint); margin: 22px 0 0; text-align: center;">
    <template v-if="label">Content from <a
      v-if="sourceUrl" :href="sourceUrl" target="_blank" rel="noopener"
      style="color: inherit; text-decoration: underline;">{{ label }}</a><span v-else>{{ label }}</span>. </template>Powered by <a
      v-if="platformUrl" :href="platformUrl" target="_blank" rel="noopener"
      style="color: inherit; text-decoration: underline;">{{ platformName }}</a><span v-else>{{ platformName }}</span>.
  </p>
</template>

<script setup>
import { config } from '../config.js'
const label = config.contentSourceLabel
const sourceUrl = config.contentSourceUrl
const platformName = config.platformName
const platformUrl = config.platformUrl
</script>
