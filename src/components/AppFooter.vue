<!-- Shared footer credit: "Content from {source}. Powered by {platform}." -->
<template>
  <p style="font-size: 11px; color: #968ba8; margin: 22px 0 0; text-align: center;">
    <template v-if="label">Content from {{ label }}. </template>Powered by <a
      v-if="platformUrl" :href="platformUrl" target="_blank" rel="noopener"
      style="color: inherit; text-decoration: underline;">{{ platformName }}</a><span v-else>{{ platformName }}</span>.
  </p>
</template>

<script setup>
import { config } from '../config.js'
const label = config.contentSourceLabel
const platformName = config.platformName
const platformUrl = config.platformUrl
</script>
