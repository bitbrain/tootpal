<template>
  <div>
    <Login v-if="!isAuthenticated" />
    <div v-else>
      <router-link to="/search">
        <Button label="Go to Search" icon="pi pi-search" />
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Button from 'primevue/button'
import Login from '@/components/Login.vue'
import { useAuthStore } from '@/stores/authStore'

export default defineComponent({
  name: 'Home',
  components: {
    Login,
    Button,
  },
  setup() {
    const authStore = useAuthStore()

    return {
      isAuthenticated: authStore.isAuthenticated,
    }
  },
})
</script>

<style scoped>
/* Add styles if needed */
</style>
