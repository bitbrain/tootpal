import { defineStore } from 'pinia'

interface User {
  id: string
  username: string
}

interface AppData {
  client_id: string
  client_secret: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || null,
    instanceUrl: localStorage.getItem('instanceUrl') || null,
    currentUser: JSON.parse(
      localStorage.getItem('currentUser') || 'null',
    ) as User | null,
    appData: JSON.parse(
      localStorage.getItem('appData') || 'null',
    ) as AppData | null,
  }),
  getters: {
    isAuthenticated: state => !!state.accessToken,
  },
  actions: {
    setAccessToken(token: string) {
      this.accessToken = token
      localStorage.setItem('accessToken', token)
    },
    setInstanceUrl(url: string) {
      this.instanceUrl = url
      localStorage.setItem('instanceUrl', url)
    },
    setCurrentUser(user: User) {
      this.currentUser = user
      localStorage.setItem('currentUser', JSON.stringify(user))
    },
    setAppData(data: AppData) {
      this.appData = data
      localStorage.setItem('appData', JSON.stringify(data))
    },
    logout() {
      this.accessToken = null
      this.instanceUrl = null
      this.currentUser = null
      this.appData = null
      localStorage.clear()
    },
  },
})
