import { createApp } from 'vue'
import 'leaflet/dist/leaflet.css'
import 'img-comparison-slider' // registers the <img-comparison-slider> web component
import './styles/base.css'
import App from './App.vue'
import { config } from './config.js'
import { theme, applyTheme } from './theme.js'
import { initAxe } from './lib/axe-dev.js'
import { initAnalytics } from './lib/analytics.js'

// brand the document from config/theme (so index.html stays org-neutral)
applyTheme()
document.title = config.appName
document.querySelector('meta[name="description"]')?.setAttribute('content', config.description)
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.bg)

initAnalytics()
createApp(App).mount('#app')
initAxe()
