import { createRouter, createMemoryHistory } from 'vue-router'
import Home from '@/views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
]

const router = createRouter({
  history: createMemoryHistory(import.meta.env.VITE_BASE_URL),
  routes,
})

export default router
