import { createApp } from 'vue'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import AdminApp from './AdminApp.vue'
import { config } from '../config.js'
import { initAxe } from '../lib/axe-dev.js'

document.title = `Admin · ${config.appName}`

createApp(AdminApp).mount('#admin')
initAxe()
