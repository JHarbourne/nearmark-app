// User settings persisted to localStorage (BRD §10 "Settings").
//   audioOn  – audio narration on/off toggle
//   units    – 'mi' | 'km' distance units

import { reactive, watch } from 'vue'
import { config } from '../config.js'

const KEY = 'nearmark-settings'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

const stored = load()

export const settings = reactive({
  audioOn: stored.audioOn ?? true,
  units: stored.units ?? config.defaultUnits,
})

watch(
  settings,
  (val) => localStorage.setItem(KEY, JSON.stringify(val)),
  { deep: true }
)
