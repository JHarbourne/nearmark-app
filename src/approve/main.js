// Entry point for the private approval page (/approve/<token>). A dedicated,
// login-free mini-app: it shows one artist their own draft story card and lets
// them approve it. Kept separate from the public app + admin so it ships only the
// StoryCard rendering path, and can never reach the rest of the app's data.
import { createApp } from 'vue'
import 'img-comparison-slider' // registers the <img-comparison-slider> web component
import '../styles/base.css'
import ApproveApp from './ApproveApp.vue'
import { config } from '../config.js'
import { theme, applyTheme } from '../theme.js'

// brand the document from config/theme (so approve.html stays org-neutral)
applyTheme()
document.title = config.appName
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.bg)

createApp(ApproveApp).mount('#approve')
