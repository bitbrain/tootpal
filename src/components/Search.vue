<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import { useAuthStore } from '@/stores/authStore'
import { useFollowStore } from '@/stores/followStore'
import mastodonService from '@/services/mastodonService'
import Results from './Results.vue'

export default defineComponent({
  name: 'Search',
  components: {
    InputText,
    Button,
    Chips,
    Results,
  },
  setup() {
    const authStore = useAuthStore()
    const followStore = useFollowStore()
    const searchServerUrl = ref('https://mastodon.social')
    const hashtags = ref(['godot', 'godotengine'])
    const results = ref<{ account: any; toot: any }[]>([])

    const search = async () => {
      try {
        results.value = await mastodonService.searchToots(
          searchServerUrl.value,
          hashtags.value,
        )
      } catch (error) {
        console.error(error)
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
    }
  },
})
</script>

<template>
  <div class="search-container">
    <div class="header">
      <h2>TootPal</h2>
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
    <Results v-if="results.length > 0" :results="results" />
  </div>
</template>

<style scoped>
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
