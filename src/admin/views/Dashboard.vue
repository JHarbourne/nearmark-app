<!-- A2 Dashboard (BRD §11.2): stats row, recent activity, quick links. -->
<template>
  <div>
    <div class="pagehead"><h1>Dashboard</h1></div>

    <div class="statgrid" style="margin-bottom:26px;">
      <div class="card stat"><div class="n">{{ store.locations.length }}</div><div class="l">Total locations</div></div>
      <div class="card stat"><div class="n">{{ store.tours.length }}</div><div class="l">Total tours</div></div>
      <div class="card stat"><div class="n">{{ published }}</div><div class="l">Published locations</div></div>
      <div class="card stat"><div class="n">{{ drafts }}</div><div class="l">Draft locations</div></div>
    </div>

    <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:20px;">
      <div class="card" style="padding:20px;">
        <h3 style="margin:0 0 14px; font-size:16px;">Recent activity</h3>
        <p v-if="!store.activity.length" class="muted" style="font-size:14px;">No activity yet this session.</p>
        <div v-for="(a, i) in store.activity" :key="i" style="display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--line); font-size:14px;">
          <span><strong>{{ a.action }}</strong> · {{ a.title }}</span>
          <span class="muted">{{ a.who }}</span>
        </div>
      </div>

      <div class="card" style="padding:20px;">
        <h3 style="margin:0 0 14px; font-size:16px;">Quick links</h3>
        <button class="btn btn-primary" style="width:100%; margin-bottom:10px;" @click="store.go('locationEditor', { id: null })">+ Add location</button>
        <button class="btn btn-ghost" style="width:100%; margin-bottom:10px;" @click="store.go('tourEditor', { id: null })">+ Add tour</button>
        <a class="btn btn-ghost" style="width:100%; display:block; text-align:center; text-decoration:none;" href="/" target="_blank">↗ View live app</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../store.js'
const published = computed(() => store.locations.filter((l) => l.status === 'published').length)
const drafts = computed(() => store.locations.filter((l) => l.status !== 'published').length)
</script>
