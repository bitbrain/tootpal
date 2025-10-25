import { generateCodeChallenge, generateRandomString } from './utils'
import { useAuthStore } from '@/stores/authStore'

// Include read:search to allow /api/v2/search checks for deep mode
const scopes = 'read:follows write:follows read:accounts read:search'

const authService = {
  async startOAuthFlow(instanceUrl: string, authStore: any) {
    try {
      const codeVerifier = generateRandomString(128)
      const codeChallenge = await generateCodeChallenge(codeVerifier)

      localStorage.setItem('codeVerifier', codeVerifier)
      authStore.setInstanceUrl(instanceUrl)

      let appData = authStore.appData
      const storedScopes = localStorage.getItem('appScopes')

      // Check if the scope has changed -> need to register them!
      if (!appData || storedScopes !== scopes) {
        appData = await this.registerApp(instanceUrl)
        authStore.setAppData(appData)
        localStorage.setItem('appScopes', scopes)
      }

      const redirectUri = window.location.origin + window.location.pathname

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: appData.client_id,
        redirect_uri: redirectUri,
        scope: scopes,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      })

      window.location.href = `${instanceUrl}/oauth/authorize?${params.toString()}`
    } catch (error) {
      console.error(error)
    }
  },

  async completeOAuthFlow(code: string) {
    try {
      const codeVerifier = localStorage.getItem('codeVerifier')
      const authStore = useAuthStore()
      const instanceUrl = authStore.instanceUrl
      const appData = authStore.appData

      if (!codeVerifier || !instanceUrl || !appData) {
        throw new Error('Missing data for OAuth flow.')
      }

      const redirectUri = window.location.origin + window.location.pathname

      const tokenResponse = await fetch(`${instanceUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: appData.client_id,
          client_secret: appData.client_secret,
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to obtain access token.')
      }

      const tokenData = await tokenResponse.json()
      authStore.setAccessToken(tokenData.access_token)

      const currentUser = await this.fetchCurrentUser(
        instanceUrl,
        tokenData.access_token,
      )
      authStore.setCurrentUser(currentUser)
    } catch (error) {
      console.error(error)
    }
  },

  async registerApp(instanceUrl: string) {
    const redirectUri = window.location.origin + window.location.pathname

    const response = await fetch(`${instanceUrl}/api/v1/apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'tootpal',
        redirect_uris: redirectUri,
        scopes: scopes,
        website: '',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to register application.')
    }

    return await response.json()
  },

  async fetchCurrentUser(instanceUrl: string, accessToken: string) {
    const response = await fetch(
      `${instanceUrl}/api/v1/accounts/verify_credentials`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    if (!response.ok) {
      throw new Error('Failed to fetch current user.')
    }
    return response.json()
  },
}

export default authService
