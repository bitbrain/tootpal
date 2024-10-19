import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'

import authService from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import Aura from '@primevue/themes/aura'

import '@/assets/styles.css'
import '@/assets/theme-overrides.css'

const app = createApp(App)

app.use(router)
app.use(createPinia())
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: 'system',
      cssLayer: false,
    },
    extend: {
      colors: {
        primary: '#3498db',
        secondary: '#2ecc71',
        accent: '#e74c3c',
      },
    },
  },
})
app.use(ToastService)

app.mount('#app')

// Handle OAuth callback
;(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  if (code) {
    // Clear the code from the URL
    urlParams.delete('code')
    window.history.replaceState({}, document.title, window.location.pathname)

    try {
      await authService.completeOAuthFlow(code)
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        router.push('/search')
      }
    } catch (error) {
      console.error(error)
    }
  }
})()
