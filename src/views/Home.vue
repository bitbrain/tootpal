\
<script lang="ts">
import { defineComponent, computed } from 'vue'
import Button from 'primevue/button'
import Login from '@/components/Login.vue'
import Search from '@/components/Search.vue'
import { useAuthStore } from '@/stores/authStore'

export default defineComponent({
  name: 'Home',
  components: {
    Login,
    Button,
    Search,
  },
  setup() {
    const authStore = useAuthStore()
    const isAuthenticated = computed(() => authStore.isAuthenticated)
    return {
      isAuthenticated,
    }
  },
})
</script>

<template>
  <div>
    <Login v-if="!isAuthenticated" />
    <Search v-else />
  </div>
</template>

<style scoped>
/* Add styles if needed */
</style>
