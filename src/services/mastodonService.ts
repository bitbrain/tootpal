import { useAuthStore } from '@/stores/authStore'
import { useFollowStore } from '@/stores/followStore'
import { parseLinkHeader, removeProtocol } from './utils'

export interface MastodonInstance {
  domain: string
  total_users: number
}

// In-memory caches for the current session
const knownAccountCache = new Map<string, boolean>()
const knownStatusCache = new Map<string, boolean>()

// Simple daisy-chained limiter for known checks against the user's home instance
let knownCheckChain: Promise<void> = Promise.resolve()
let lastKnownCheckAt = 0
const MIN_KNOWN_CHECK_INTERVAL_MS = 220

async function scheduleKnownCheck<T>(task: () => Promise<T>): Promise<T> {
  let run!: () => void
  const gate = new Promise<void>(resolve => (run = resolve))
  // Chain tasks one after another
  const scheduled = knownCheckChain.then(async () => {
    const now = Date.now()
    const wait = Math.max(0, MIN_KNOWN_CHECK_INTERVAL_MS - (now - lastKnownCheckAt))
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    run()
  })
  knownCheckChain = scheduled.catch(() => {})
  await gate
  try {
    const result = await task()
    lastKnownCheckAt = Date.now()
    return result
  } finally {
    // no-op; chain already advanced
  }
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
        if (response.status === 429) {
          // Try to read rate limit headers
          const retryAfterHeader = response.headers.get('retry-after')
          const resetHeader = response.headers.get('x-ratelimit-reset')
          let retryAfterSeconds: number | null = null
          let retryAtMs: number | null = null

          if (retryAfterHeader) {
            const s = parseInt(retryAfterHeader, 10)
            if (!Number.isNaN(s)) {
              retryAfterSeconds = s
              retryAtMs = Date.now() + s * 1000
            } else {
              // Retry-After can also be a HTTP date
              const d = Date.parse(retryAfterHeader)
              if (!Number.isNaN(d)) retryAtMs = d
            }
          }
          if (!retryAtMs && resetHeader) {
            const resetUnix = parseInt(resetHeader, 10)
            if (!Number.isNaN(resetUnix)) retryAtMs = resetUnix * 1000
          }

          const err: any = new Error('Rate limited while fetching following accounts')
          err.rateLimited = true
          err.retryAfterSeconds = retryAfterSeconds ?? null
          err.retryAt = retryAtMs ?? null
          err.status = 429
          throw err
        }
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

  async isAccountKnownToInstance(acct: string): Promise<boolean> {
    const cacheKey = acct.toLowerCase()
    if (knownAccountCache.has(cacheKey)) return knownAccountCache.get(cacheKey) as boolean

    const authStore = useAuthStore()
    if (!authStore.instanceUrl || !authStore.accessToken) return false

    const url = new URL(`${authStore.instanceUrl}/api/v2/search`)
    url.searchParams.set('q', acct)
    url.searchParams.set('type', 'accounts')
    url.searchParams.set('resolve', 'false')

    try {
      const response = await scheduleKnownCheck(() =>
        fetch(url.toString(), {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
        }),
      )
      if (response.status === 401 || response.status === 403) {
        // Insufficient permissions or instance policy – treat as unknown and let UI warn
        const err: any = new Error('Forbidden search for accounts')
        err.permissionError = true
        throw err
      }
      if (!response.ok) {
        knownAccountCache.set(cacheKey, false)
        return false
      }
      const data = await response.json()
      const found = Array.isArray(data.accounts) && data.accounts.length > 0
      knownAccountCache.set(cacheKey, found)
      return found
    } catch (e: any) {
      if (e && e.permissionError) {
        // Do not cache negative; upstream can decide to disable deepMode
        return false
      }
      knownAccountCache.set(cacheKey, false)
      return false
    }
  },

  async isStatusKnownToInstance(statusUrl: string): Promise<boolean> {
    const cacheKey = statusUrl
    if (knownStatusCache.has(cacheKey)) return knownStatusCache.get(cacheKey) as boolean

    const authStore = useAuthStore()
    if (!authStore.instanceUrl || !authStore.accessToken) return false

    const url = new URL(`${authStore.instanceUrl}/api/v2/search`)
    url.searchParams.set('q', statusUrl)
    url.searchParams.set('type', 'statuses')
    url.searchParams.set('resolve', 'false')

    try {
      const response = await scheduleKnownCheck(() =>
        fetch(url.toString(), {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
        }),
      )
      if (response.status === 401 || response.status === 403) {
        const err: any = new Error('Forbidden search for statuses')
        err.permissionError = true
        throw err
      }
      if (!response.ok) {
        knownStatusCache.set(cacheKey, false)
        return false
      }
      const data = await response.json()
      const found = Array.isArray(data.statuses) && data.statuses.length > 0
      knownStatusCache.set(cacheKey, found)
      return found
    } catch (e: any) {
      if (e && e.permissionError) {
        return false
      }
      knownStatusCache.set(cacheKey, false)
      return false
    }
  },

  async searchUnfollowedToots(
    serverUrl: string,
    hashtags: string[],
    limit: number,
    maxId: string | null = null, // Optional param for pagination control
    options?: { deepMode?: boolean; filterStatuses?: boolean },
  ) {
    const accountsMap = new Map<string, { account: any; toot: any }>()
    const followStore = useFollowStore()
    const deepMode = options?.deepMode === true
    const filterStatuses = options?.filterStatuses === true
    const authStore = useAuthStore()
    const serverDomain = removeProtocol(serverUrl)

    // Prefer acct from currentUser if present; fallback to username@home
    const currentUserAcct = (authStore.currentUser as any)?.acct as string | undefined
    const currentUserCanonicalAcct = currentUserAcct
      ? currentUserAcct
      : authStore.currentUser && authStore.instanceUrl
        ? `${authStore.currentUser.username}@${removeProtocol(authStore.instanceUrl)}`
        : null

    // Deep-mode should not query own instance
    if (deepMode && authStore.instanceUrl && removeProtocol(authStore.instanceUrl).toLowerCase() === serverDomain.toLowerCase()) {
      return []
    }

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
          const acctRaw: string = status.account.acct
          let canonicalAcct: string
          if (acctRaw.includes('@')) {
            canonicalAcct = acctRaw
          } else {
            // Derive host from profile URL when available; fallback to server domain
            let host: string | null = null
            try {
              const urlStr = (status.account as any).url as string | undefined
              if (urlStr) host = new URL(urlStr).host
            } catch (_e) {
              host = null
            }
            canonicalAcct = `${acctRaw}@${(host || serverDomain)}`
          }

          // Skip self
          if (currentUserCanonicalAcct && canonicalAcct.toLowerCase() === currentUserCanonicalAcct.toLowerCase()) {
            continue
          }

          // If we can, skip by acct for already-followed
          if (followStore.isFollowingAcct && followStore.isFollowingAcct(canonicalAcct)) {
            continue
          }

          if (deepMode) {
            // Optionally filter statuses known to our instance
            // Batch account-known checks per unique acct to reduce calls
            // Build a per-request memo of known accounts
            const localKnown = (this as any).__localKnownAccounts as Map<string, boolean> | undefined
            let knownMap = localKnown
            if (!knownMap) {
              knownMap = new Map<string, boolean>()
              ;(this as any).__localKnownAccounts = knownMap
            }
            let knownAccount: boolean
            if (knownMap.has(canonicalAcct)) {
              knownAccount = knownMap.get(canonicalAcct) as boolean
            } else {
              knownAccount = await this.isAccountKnownToInstance(canonicalAcct)
              knownMap.set(canonicalAcct, knownAccount)
            }
            if (knownAccount) continue

            if (filterStatuses) {
              const statusUrl = (status as any).url || (status as any).uri
              if (statusUrl) {
                const knownStatus = await this.isStatusKnownToInstance(statusUrl)
                if (knownStatus) continue
              }
            }

            // Optionally honor discoverable if present on the embedded account
            if (status.account && status.account.discoverable === false) {
              continue
            }

            const account = { ...status.account, acct: canonicalAcct }
            const acctKey = canonicalAcct

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
          } else {
            // Legacy behavior: resolve to local instance for richer data
            const resolvedAccount =
              resolvedAccounts[canonicalAcct] ||
              (await this.resolveAccount(canonicalAcct))

            // Skip self (by id if available)
            if (authStore.currentUser && resolvedAccount.id === authStore.currentUser.id) {
              continue
            }

            if (followStore.isFollowing(resolvedAccount.id)) {
              continue
            }

            if (resolvedAccount.discoverable === false) {
              continue
            }

            resolvedAccounts[canonicalAcct] = resolvedAccount
            const account = resolvedAccount
            const acctKey = resolvedAccount.acct

            if (accountsMap.has(acctKey)) {
              const existingEntry = accountsMap.get(acctKey)!
              if (
                new Date(status.created_at) >
                new Date(existingEntry.toot.created_at)
              ) {
                accountsMap.set(acctKey, { account, toot: status })
              }
            } else {
              accountsMap.set(acctKey, { account, toot: status })
            }
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
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after')
        const resetHeader = response.headers.get('x-ratelimit-reset')
        let retryAtMs: number | null = null
        if (retryAfterHeader) {
          const s = parseInt(retryAfterHeader, 10)
          if (!Number.isNaN(s)) retryAtMs = Date.now() + s * 1000
          else {
            const d = Date.parse(retryAfterHeader)
            if (!Number.isNaN(d)) retryAtMs = d
          }
        }
        if (!retryAtMs && resetHeader) {
          const resetUnix = parseInt(resetHeader, 10)
          if (!Number.isNaN(resetUnix)) retryAtMs = resetUnix * 1000
        }
        const err: any = new Error('Rate limited when following')
        err.rateLimited = true
        err.retryAt = retryAtMs
        err.status = 429
        throw err
      }
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

  async followByAcct(acct: string) {
    const localAccount = await this.resolveAccount(acct)
    await this.followUser(localAccount)
    return localAccount
  },

  async listServers(): Promise<MastodonInstance[]> {
    const response = await fetch('https://api.joinmastodon.org/servers')
    const data = await response.json()
    const instances = data as MastodonInstance[]
    return instances.sort((i1, i2) => i2.total_users - i1.total_users)
  },

  async searchAcrossInstances(
    hashtags: string[],
    options: {
      maxServers: number
      concurrency: number
      perServerLimit: number
      deepMode?: boolean
      filterStatuses?: boolean
      randomize?: boolean
      seed?: number
    },
    callbacks?: {
      onResult?: (item: { account: any; toot: any }) => void
      onProgress?: (completed: number, total: number) => void
    },
  ): Promise<{
    results: { account: any; toot: any }[]
    state: {
      servers: string[]
      cursors: Record<string, string | null>
      deepMode: boolean
      filterStatuses: boolean
      hashtags: string[]
      perServerLimit: number
    }
  }> {
    const instances = await this.listServers()
    let servers = instances.map(i => `https://${i.domain}`)
    if (options.randomize !== false) {
      // Fisher-Yates shuffle (deterministic if seed provided)
      const rng = (() => {
        let s = options.seed ?? Date.now()
        return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
      })()
      for (let i = servers.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[servers[i], servers[j]] = [servers[j], servers[i]]
      }
    }
    servers = servers.slice(0, Math.max(1, options.maxServers))

    const total = servers.length
    let completed = 0
    const globalMap = new Map<string, { account: any; toot: any }>()
    const cursors: Record<string, string | null> = {}

    const worker = async (serverUrl: string) => {
      try {
        const res: any = await this.searchUnfollowedToots(
          serverUrl,
          hashtags,
          options.perServerLimit,
          null,
          { deepMode: options.deepMode, filterStatuses: options.filterStatuses },
        )
        const items: { account: any; toot: any }[] = res
        const lastId: string | null = items.length ? items[items.length - 1].toot.id : null

        for (const item of items) {
          const acctKey = item.account.acct
          if (!globalMap.has(acctKey)) {
            globalMap.set(acctKey, item)
            callbacks?.onResult?.(item)
          } else {
            const existing = globalMap.get(acctKey)!
            if (
              new Date(item.toot.created_at) > new Date(existing.toot.created_at)
            ) {
              globalMap.set(acctKey, item)
            }
          }
        }
        cursors[serverUrl] = lastId ?? null
      } catch (e) {
        cursors[serverUrl] = null
      } finally {
        completed += 1
        callbacks?.onProgress?.(completed, total)
      }
    }

    // Bounded concurrency over servers (exclude own instance in deep mode)
    const queue = [...servers]
    if (options.deepMode) {
      try {
        const authStore = useAuthStore()
        const own = authStore.instanceUrl ? `https://${removeProtocol(authStore.instanceUrl)}` : null
        if (own) {
          for (let i = queue.length - 1; i >= 0; i--) {
            if (removeProtocol(queue[i]).toLowerCase() === removeProtocol(own).toLowerCase()) {
              queue.splice(i, 1)
            }
          }
        }
      } catch (_e) {}
    }
    const running: Promise<void>[] = []
    const runNext = async () => {
      const server = queue.shift()
      if (!server) return
      await worker(server)
      await runNext()
    }
    const poolSize = Math.max(1, options.concurrency)
    for (let i = 0; i < poolSize; i++) {
      running.push(runNext())
    }
    await Promise.all(running)

    const results = Array.from(globalMap.values()).sort(
      (a, b) =>
        new Date(b.toot.created_at).getTime() - new Date(a.toot.created_at).getTime(),
    )

    return {
      results,
      state: {
        servers,
        cursors,
        deepMode: !!options.deepMode,
        filterStatuses: !!options.filterStatuses,
        hashtags,
        perServerLimit: options.perServerLimit,
      },
    }
  },

  async searchAcrossInstancesNextPage(
    state: {
      servers: string[]
      cursors: Record<string, string | null>
      deepMode: boolean
      filterStatuses: boolean
      hashtags: string[]
      perServerLimit: number
    },
    options: { concurrency: number },
    callbacks?: {
      onResult?: (item: { account: any; toot: any }) => void
      onProgress?: (completed: number, total: number) => void
    },
  ): Promise<{
    results: { account: any; toot: any }[]
    state: {
      servers: string[]
      cursors: Record<string, string | null>
      deepMode: boolean
      filterStatuses: boolean
      hashtags: string[]
      perServerLimit: number
    }
  }> {
    const total = state.servers.length
    let completed = 0
    const updatedCursors: Record<string, string | null> = { ...state.cursors }
    const globalMap = new Map<string, { account: any; toot: any }>()

    const worker = async (serverUrl: string) => {
      const maxId = state.cursors[serverUrl]
      if (!maxId) {
        completed += 1
        callbacks?.onProgress?.(completed, total)
        return
      }
      try {
        const res: any = await this.searchUnfollowedToots(
          serverUrl,
          state.hashtags,
          state.perServerLimit,
          maxId,
          { deepMode: state.deepMode, filterStatuses: state.filterStatuses },
        )
        const items: { account: any; toot: any }[] = res
        const lastId: string | null = items.length ? items[items.length - 1].toot.id : null

        for (const item of items) {
          const acctKey = item.account.acct
          if (!globalMap.has(acctKey)) {
            globalMap.set(acctKey, item)
            callbacks?.onResult?.(item)
          } else {
            const existing = globalMap.get(acctKey)!
            if (
              new Date(item.toot.created_at) > new Date(existing.toot.created_at)
            ) {
              globalMap.set(acctKey, item)
            }
          }
        }
        updatedCursors[serverUrl] = lastId ?? null
      } catch (_e) {
        updatedCursors[serverUrl] = null
      } finally {
        completed += 1
        callbacks?.onProgress?.(completed, total)
      }
    }

    const queue = [...state.servers]
    const running: Promise<void>[] = []
    const runNext = async () => {
      const server = queue.shift()
      if (!server) return
      await worker(server)
      await runNext()
    }
    const poolSize = Math.max(1, options.concurrency)
    for (let i = 0; i < poolSize; i++) running.push(runNext())
    await Promise.all(running)

    const results = Array.from(globalMap.values()).sort(
      (a, b) =>
        new Date(b.toot.created_at).getTime() - new Date(a.toot.created_at).getTime(),
    )

    return {
      results,
      state: { ...state, cursors: updatedCursors },
    }
  },
}

export default mastodonService
