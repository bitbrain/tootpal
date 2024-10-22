import { useAuthStore } from '@/stores/authStore'
import { useFollowStore } from '@/stores/followStore'
import { parseLinkHeader, removeProtocol } from './utils'

export interface MastodonInstance {
  domain: string
  total_users: number
}

const mastodonService = {
  async getFollowing() {
    const authStore = useAuthStore()
    const accountId = authStore.currentUser?.id

    // Fetch all following accounts with pagination
    const followingAccounts = []
    let url: string | null =
      `${authStore.instanceUrl}/api/v1/accounts/${accountId}/following?limit=80`

    while (url) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(
          `Error fetching following accounts: ${response.statusText}`,
        )
      }

      const accounts = await response.json()
      followingAccounts.push(...accounts)

      // Handle pagination
      const linkHeader = response.headers.get('link')
      if (linkHeader) {
        const parsedLinks = parseLinkHeader(linkHeader)
        url = parsedLinks.next
      } else {
        url = null
      }
    }

    return followingAccounts
  },

  async searchUnfollowedToots(
    serverUrl: string,
    hashtags: string[],
    limit: number,
    maxId: string | null = null, // Optional param for pagination control
  ) {
    const accountsMap = new Map<string, { account: any; toot: any }>()
    const followStore = useFollowStore()

    for (const tag of hashtags) {
      let url = `${serverUrl}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=${limit}`

      if (maxId) {
        url += `&max_id=${maxId}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`)
      }

      const statuses = await response.json()

      const resolvedAccounts: Record<string, any> = {}

      for (const status of statuses) {
        try {
          const globalAcc = `${status.account.acct}@${removeProtocol(serverUrl)}`
          const resolvedAccount =
            resolvedAccounts[globalAcc] ||
            (await this.resolveAccount(globalAcc))

          if (followStore.isFollowing(resolvedAccount.id)) {
            // skip anything that is already followed - not worth showing
            continue
          }

          if (!resolvedAccount.discoverable) {
            // hide accounts that don't want to be discovered.
            continue
          }

          resolvedAccounts[globalAcc] = resolvedAccount
          const account = resolvedAccount
          const acctKey = resolvedAccount.acct

          if (accountsMap.has(acctKey)) {
            const existingEntry = accountsMap.get(acctKey)!
            // Update to the most recent toot
            if (
              new Date(status.created_at) >
              new Date(existingEntry.toot.created_at)
            ) {
              accountsMap.set(acctKey, { account, toot: status })
            }
          } else {
            accountsMap.set(acctKey, { account, toot: status })
          }
        } catch (error) {
          console.error(error)
        }
      }
    }

    const sortedResults = Array.from(accountsMap.values()).sort(
      (a, b) =>
        new Date(b.toot.created_at).getTime() -
        new Date(a.toot.created_at).getTime(),
    )

    return sortedResults
  },

  async followUser(account: any) {
    const authStore = useAuthStore()

    const url = `${authStore.instanceUrl}/api/v1/accounts/${account.id}/follow`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Error following user: ${response.statusText}`)
    }
  },

  async resolveAccount(unresolvedAccountId: string) {
    const authStore = useAuthStore()
    // account may not belong to the server yet.
    // we have to explicitly resolve it at our instance first!
    const lookupUrl = `${authStore.instanceUrl}/api/v1/accounts/lookup?acct=${unresolvedAccountId}`

    const lookedUpResponse = await fetch(lookupUrl, {
      method: 'GET',
    })

    if (!lookedUpResponse.ok) {
      throw new Error(
        `Unable to resolve account: ${lookedUpResponse.statusText}`,
      )
    }

    return lookedUpResponse.json()
  },

  async listServers(): Promise<MastodonInstance[]> {
    const response = await fetch('https://api.joinmastodon.org/servers')
    const data = await response.json()
    const instances = data as MastodonInstance[]
    return instances.sort((i1, i2) => i2.total_users - i1.total_users)
  },
}

export default mastodonService
