<script lang="ts">
import { defineComponent, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useAuthStore } from '@/stores/authStore'
import authService from '@/services/authService'

export default defineComponent({
  name: 'Login',
  components: {
    Button,
    Dialog,
    InputText,
  },
  setup() {
    const authStore = useAuthStore()
    const showLoginDialog = ref(false)
    const instanceUrl = ref('https://')

    const login = async () => {
      if (instanceUrl.value) {
        try {
          await authService.startOAuthFlow(
            instanceUrl.value.trim().replace(/\/$/, ''),
            authStore,
          )
          showLoginDialog.value = false
        } catch (error) {
          console.error(error)
        }
      }
    }

    return {
      showLoginDialog,
      instanceUrl,
      login,
    }
  },
})
</script>

<template>
  <div class="login-container">
    <div class="p-card">
      <div class="p-card-body">
        <h2>Welcome to TootPal</h2>
        <p>Discover your pals across the fediverse!</p>
        <Button
          label="Log in with Mastodon"
          icon="pi pi-mastodon"
          @click="showLoginDialog = true"
        />
      </div>
    </div>

    <!-- Login Dialog -->
    <Dialog
      class="p-dialog"
      header="Log in with Mastodon"
      :visible.sync="showLoginDialog"
      @update:visible="showLoginDialog = false"
      modal
    >
      <div class="p-fluid">
        <div class="p-field">
          <label for="instanceUrl">Mastodon Instance URL</label>
          <InputText
            id="instanceUrl"
            v-model="instanceUrl"
            placeholder="https://mastodon.social"
          />
        </div>
        <div class="dialog-footer">
          <Button
            label="Cancel"
            icon="pi pi-times"
            @click="showLoginDialog = false"
            class="p-button-text"
          />
          <Button label="Login" icon="pi pi-check" @click="login" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.p-card {
  max-width: 400px;
  text-align: center;
}
label {
  display: block;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
