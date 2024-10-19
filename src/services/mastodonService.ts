const mastodonService = {
  async searchToots(serverUrl: string, hashtags: string[]) {
    const accountsMap = new Map<string, { account: any; toot: any }>()

    for (const tag of hashtags) {
      const url = `${serverUrl}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=40`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`)
      }

      const statuses = await response.json()

      statuses.forEach((status: any) => {
        const account = status.account
        const acctKey = account.acct

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
      })
    }

    // Return an array of objects containing account and toot
    return Array.from(accountsMap.values())
  },

  async getRelationships(
    accounts: any[],
    instanceUrl: string,
    accessToken: string,
  ) {
    const idMap = new Map()
    const relationshipsMap = new Map()

    for (const account of accounts) {
      const lookupUrl = `${instanceUrl}/api/v1/accounts/lookup?acct=${encodeURIComponent(account.acct)}&resolve=true`

      const lookupResponse = await fetch(lookupUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (lookupResponse.ok) {
        const accountData = await lookupResponse.json()
        idMap.set(account.acct, accountData.id)
      } else {
        relationshipsMap.set(account.acct, null)
        continue
      }
    }

    const ids = Array.from(idMap.values())

    if (ids.length === 0) {
      return relationshipsMap
    }

    const params = new URLSearchParams()
    ids.forEach(id => params.append('id[]', id))

    const relationshipsUrl = `${instanceUrl}/api/v1/accounts/relationships?${params.toString()}`

    const response = await fetch(relationshipsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Error fetching relationships: ${response.statusText}`)
    }

    const relationshipsData = await response.json()

    relationshipsData.forEach((relationship: any) => {
      const acct = Array.from(idMap.keys()).find(
        key => idMap.get(key) === relationship.id,
      )
      if (acct) {
        relationshipsMap.set(acct, relationship)
      }
    })

    return relationshipsMap
  },

  async getRelationship(
    account: any,
    instanceUrl: string,
    accessToken: string,
  ) {
    const lookupUrl = `${instanceUrl}/api/v1/accounts/lookup?acct=${encodeURIComponent(account.acct)}&resolve=true`

    const lookupResponse = await fetch(lookupUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!lookupResponse.ok) {
      return null
    }

    const accountData = await lookupResponse.json()

    const relationshipsUrl = `${instanceUrl}/api/v1/accounts/relationships?id[]=${accountData.id}`

    const response = await fetch(relationshipsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const relationshipsData = await response.json()
    return relationshipsData[0]
  },

  async followUser(account: any, instanceUrl: string, accessToken: string) {
    const lookupUrl = `${instanceUrl}/api/v1/accounts/lookup?acct=${encodeURIComponent(account.acct)}&resolve=true`

    const lookupResponse = await fetch(lookupUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!lookupResponse.ok) {
      throw new Error(`Could not lookup account ${account.acct}`)
    }

    const accountData = await lookupResponse.json()
    const accountId = accountData.id

    const url = `${instanceUrl}/api/v1/accounts/${accountId}/follow`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Error following user: ${response.statusText}`)
    }
  },
}

export default mastodonService
