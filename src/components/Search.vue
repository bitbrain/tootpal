<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import { useAuthStore } from '@/stores/authStore'
import { useFollowStore } from '@/stores/followStore'
import mastodonService from '@/services/mastodonService'
import Results from './Results.vue'
import ProgressSpinner from 'primevue/progressspinner'

const limit = 20

export default defineComponent({
  name: 'Search',
  components: {
    InputText,
    Button,
    Chips,
    Results,
    ProgressSpinner,
  },
  setup() {
    const authStore = useAuthStore()
    const followStore = useFollowStore()
    const searchServerUrl = ref('https://mastodon.social')
    const hashtags = ref(['godot', 'godotengine'])
    const results = ref<{ account: any; toot: any }[]>([])
    const loading = ref(false)

    const search = async () => {
      try {
        loading.value = true
        results.value = await mastodonService.searchUnfollowedToots(
          searchServerUrl.value,
          hashtags.value,
          limit,
        )
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    const logout = () => {
      authStore.logout()
      window.location.reload()
    }

    // ensure to load the people we are following already beforehand
    onMounted(async () => {
      try {
        const followingUsers = await mastodonService.getFollowing()
        followStore.setFollowers(followingUsers.map(user => user.id))
      } catch (error) {
        console.error(error)
      }
    })

    return {
      searchServerUrl,
      hashtags,
      results,
      search,
      logout,
      loading,
    }
  },
})
</script>

<template>
  <div class="search-container">
    <div class="header">
      <h2>tootpal</h2>
      <Button
        label="Logout"
        icon="pi pi-sign-out"
        class="p-button-danger"
        @click="logout"
      />
    </div>
    <div class="search-form">
      <div class="grid-form">
        <InputText
          v-model="searchServerUrl"
          placeholder="Mastodon Server URL to Search"
        />
        <Chips v-model="hashtags" placeholder="Enter hashtags" />
        <Button label="Search" icon="pi pi-search" @click="search" />
      </div>
    </div>
    <div class="content">
      <Results v-if="results.length > 0" :results="results" />
      <ProgressSpinner v-else-if="loading" aria-label="Loading" />
      <h3 v-else class="info">Search for hashtags to get started!</h3>
    </div>
  </div>
</template>

<style scoped>
.content {
  margin-top: 3rem;
  display: flex;
  justify-content: center;
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
