<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import { useAuthStore } from '@/stores/authStore'
import { useFollowStore } from '@/stores/followStore'
import mastodonService from '@/services/mastodonService'
import Results from './Results.vue'
import ProgressSpinner from 'primevue/progressspinner'
import router from '@/router'
import ServerSelect from './ServerSelect.vue'
import { removeProtocol } from '@/services/utils'

const limit = 90

export default defineComponent({
  name: 'Search',
  components: {
    InputText,
    Button,
    Chips,
    Results,
    ProgressSpinner,
    ServerSelect,
  },
  setup() {
    const authStore = useAuthStore()
    const followStore = useFollowStore()
    // Helpers for localStorage
    const getBool = (key: string, def: boolean) => {
      const v = localStorage.getItem(key)
      return v === null ? def : v === 'true'
    }
    const getNum = (key: string, def: number) => {
      const v = localStorage.getItem(key)
      if (v === null) return def
      const n = parseInt(v, 10)
      return Number.isNaN(n) ? def : n
    }
    const getJson = <T>(key: string, def: T): T => {
      try {
        const v = localStorage.getItem(key)
        return v ? (JSON.parse(v) as T) : def
      } catch {
        return def
      }
    }

    const searchServerUrl = ref<string | null>(
      localStorage.getItem('tp.searchServerUrl') || null,
    )
    const hashtags = ref<string[]>(getJson<string[]>('tp.hashtags', ['godot']))
    const results = ref<{ account: any; toot: any }[]>([])
    const loading = ref(false)
    const lastId = ref(null)
    const deepMode = ref(getBool('tp.deepMode', false))
    const filterStatuses = ref(getBool('tp.filterStatuses', false))

    // Multi-instance options
    const exploreMulti = ref(getBool('tp.exploreMulti', false))
    const maxServers = ref(getNum('tp.maxServers', 15))
    const concurrency = ref(getNum('tp.concurrency', 4))
    const perServerLimit = ref(getNum('tp.perServerLimit', 60))
    const randomize = ref(getBool('tp.randomize', true))
    const progressCompleted = ref(0)
    const progressTotal = ref(0)
    const multiState = ref<any>(null)
    const rateLimitRetryAt = ref<number | null>(null)
    const rateLimitInterval = ref<number | null>(null)
    const rateLimitCountdown = ref<string>('')

    const search = async () => {
      try {
        loading.value = true
        results.value = []
        progressCompleted.value = 0
        progressTotal.value = 0
        multiState.value = null

        let followingUsers: any[] = []
        try {
          followingUsers = await mastodonService.getFollowing()
          rateLimitRetryAt.value = null
        } catch (e: any) {
          if (e && e.rateLimited) {
            rateLimitRetryAt.value = e.retryAt
            // start/update countdown timer
            if (rateLimitInterval.value) window.clearInterval(rateLimitInterval.value)
            const updateCountdown = () => {
              if (!rateLimitRetryAt.value) return
              const delta = Math.max(0, rateLimitRetryAt.value - Date.now())
              const s = Math.ceil(delta / 1000)
              const m = Math.floor(s / 60)
              const rems = s % 60
              rateLimitCountdown.value = `${m}:${rems.toString().padStart(2, '0')}`
              if (delta <= 0) {
                window.clearInterval(rateLimitInterval.value as number)
                rateLimitInterval.value = null
              }
            }
            updateCountdown()
            rateLimitInterval.value = window.setInterval(updateCountdown, 1000)
          } else {
            console.error(e)
          }
        }
        // Store both id and canonical acct; if acct lacks domain, try from profile URL host
        const homeDomain = authStore.instanceUrl ? removeProtocol(authStore.instanceUrl) : ''
        followStore.setFollowersWithAcct(
          (followingUsers || []).map((user: any) => {
            let acctVal: string | undefined = undefined
            if (typeof user.acct === 'string') {
              if (user.acct.includes('@')) {
                acctVal = user.acct
              } else {
                let host: string | null = null
                try {
                  if (typeof user.url === 'string') host = new URL(user.url).host
                } catch (_e) {
                  host = null
                }
                const domain = host || homeDomain
                acctVal = domain ? `${user.acct}@${domain}` : undefined
              }
            }
            return { id: user.id, acct: acctVal }
          }),
        )

        if (exploreMulti.value) {
          const res = await mastodonService.searchAcrossInstances(
            hashtags.value,
            {
              maxServers: maxServers.value,
              concurrency: concurrency.value,
              perServerLimit: perServerLimit.value,
              deepMode: deepMode.value,
              filterStatuses: filterStatuses.value,
              randomize: randomize.value,
            },
            {
              onResult: item => {
                results.value.push(item)
              },
              onProgress: (completed, total) => {
                progressCompleted.value = completed
                progressTotal.value = total
              },
            },
          )
          // Save state for pagination (expand search)
          multiState.value = res.state
          // ensure results contain any late arrivals already pushed
          // and include final sorted results
          // Merge unique by acct
          const existing = new Map(results.value.map(r => [r.account.acct, r]))
          for (const item of res.results) existing.set(item.account.acct, item)
          results.value = Array.from(existing.values()).sort(
            (a, b) =>
              new Date(b.toot.created_at).getTime() -
              new Date(a.toot.created_at).getTime(),
          )
        } else if (searchServerUrl.value) {
          // If deep checks are forbidden by policy/permissions, fall back to legacy filtering and show note
          try {
            results.value = await mastodonService.searchUnfollowedToots(
            searchServerUrl.value,
            hashtags.value,
            limit,
            lastId.value,
            { deepMode: deepMode.value, filterStatuses: filterStatuses.value },
            )
          } catch (e: any) {
            console.error(e)
          }
          lastId.value = results.value.length
            ? results.value[results.value.length - 1].toot.id
            : null
        }
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    const expandSearch = async () => {
      loading.value = true
      try {
        if (exploreMulti.value && multiState.value) {
          const next = await mastodonService.searchAcrossInstancesNextPage(
            multiState.value,
            { concurrency: concurrency.value },
            {
              onResult: item => {
                // progressive add
                const idx = results.value.findIndex(
                  r => r.account.acct === item.account.acct,
                )
                if (idx === -1) results.value.push(item)
                else if (
                  new Date(item.toot.created_at) >
                  new Date(results.value[idx].toot.created_at)
                ) {
                  results.value[idx] = item
                }
              },
              onProgress: (completed, total) => {
                progressCompleted.value = completed
                progressTotal.value = total
              },
            },
          )
          multiState.value = next.state
          // unify and sort
          const uniq = new Map(results.value.map(r => [r.account.acct, r]))
          for (const item of next.results) uniq.set(item.account.acct, item)
          results.value = Array.from(uniq.values()).sort(
            (a, b) =>
              new Date(b.toot.created_at).getTime() -
              new Date(a.toot.created_at).getTime(),
          )
        } else {
          lastId.value = results.value[results.value.length - 1].toot.id
          if (searchServerUrl.value) {
            results.value.push(
              ...(await mastodonService.searchUnfollowedToots(
                searchServerUrl.value,
                hashtags.value,
                limit,
                lastId.value,
                { deepMode: deepMode.value, filterStatuses: filterStatuses.value },
              )),
            )
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    const logout = () => {
      authStore.logout()
      router.push('/')
      window.location.reload()
    }

    // Persist settings
    watch(searchServerUrl, v => {
      if (v) localStorage.setItem('tp.searchServerUrl', v)
      else localStorage.removeItem('tp.searchServerUrl')
    })
    watch(hashtags, v => {
      localStorage.setItem('tp.hashtags', JSON.stringify(v))
    }, { deep: true })
    watch(deepMode, v => localStorage.setItem('tp.deepMode', String(v)))
    watch(filterStatuses, v => localStorage.setItem('tp.filterStatuses', String(v)))
    watch(exploreMulti, v => localStorage.setItem('tp.exploreMulti', String(v)))
    watch(maxServers, v => localStorage.setItem('tp.maxServers', String(v)))
    watch(concurrency, v => localStorage.setItem('tp.concurrency', String(v)))
    watch(perServerLimit, v => localStorage.setItem('tp.perServerLimit', String(v)))
    watch(randomize, v => localStorage.setItem('tp.randomize', String(v)))

    return {
      searchServerUrl,
      hashtags,
      results,
      search,
      expandSearch,
      logout,
      loading,
      deepMode,
      filterStatuses,
      exploreMulti,
      maxServers,
      concurrency,
      perServerLimit,
      randomize,
      progressCompleted,
      progressTotal,
      rateLimitRetryAt,
      rateLimitCountdown,
    }
  },
})
</script>

<template>
  <div class="search-container">
    <div class="header">
      <h2 class="logo"><img src="@/assets/images/mastodon-logo.svg" height="20"></img>tootpal</h2>
      <Button
        label="Logout"
        icon="pi pi-sign-out"
        class="p-button-danger"
        @click="logout"
      />
    </div>
    <div class="search-form">
      <div class="grid-form">
        <ServerSelect v-model="searchServerUrl" />
        <Chips v-model="hashtags" placeholder="Enter hashtags" />
        <Button
          :disabled="(!searchServerUrl && !exploreMulti) || !hashtags.length"
          label="Search"
          icon="pi pi-search"
          @click="search"
        />
      </div>
      <div class="options">
        <div class="row">
          <label><input type="checkbox" v-model="deepMode" /> Deep mode</label>
          <label><input type="checkbox" v-model="filterStatuses" /> Filter statuses</label>
        </div>
        <div class="row">
          <label><input type="checkbox" v-model="exploreMulti" /> Explore multiple servers</label>
          <template v-if="exploreMulti">
            <label>Max servers <input type="number" v-model.number="maxServers" min="1" max="100" style="width:5rem" /></label>
            <label>Concurrency <input type="number" v-model.number="concurrency" min="1" max="10" style="width:5rem" /></label>
            <label>Per server limit <input type="number" v-model.number="perServerLimit" min="20" max="90" step="10" style="width:6rem" /></label>
            <label><input type="checkbox" v-model="randomize" /> Randomize</label>
          </template>
        </div>
        <div class="row" v-if="exploreMulti && progressTotal">
          <small>Scanning {{ progressCompleted }} / {{ progressTotal }} servers…</small>
        </div>
        <div class="row" v-if="deepMode">
          <small>
            Note: Deep mode may be limited by your instance permissions/policy. If you see many 403s, re-login to grant
            additional scopes or keep deep mode off.
          </small>
        </div>
        <div class="row" v-if="rateLimitRetryAt">
          <small>Rate limited fetching following list. Retry in {{ rateLimitCountdown }}.</small>
        </div>
      </div>
    </div>
    <div class="content">
      <Results v-if="results.length > 0" :results="results" />
      <Button v-if="results.length > 0 && !loading" @click="expandSearch"
        >Expand Search!</Button
      >
      <ProgressSpinner v-else-if="loading" aria-label="Loading" />
      <h3 v-else class="info">Search for hashtags to get started!</h3>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  max-width: 1024px;
}
.search-form {
  padding: .3rem;
  background: rgb(from var(--p-zinc-950) r g b / 0.25);
  border-radius: 10px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.content {
  margin-top: 3rem;
  display: flex;
  align-items: center;
  flex-direction: column;
}
.info {
  text-align: center;
}
.search-container {
  padding: 1rem;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search-form {
  margin-top: 1rem;
}
.grid-form {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  gap: 1rem;
  align-items: end;
}
</style>
