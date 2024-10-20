<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Toot from './Toot.vue'
import { useAuthStore } from '@/stores/authStore'
import mastodonService from '@/services/mastodonService'
import { useFollowStore } from '@/stores/followStore'

export default defineComponent({
  name: 'TootCard',
  components: {
    Card,
    Button,
    Avatar,
    Toot,
  },
  props: {
    account: {
      type: Object as () => any,
      required: true,
    },
    toot: {
      type: Object as () => any,
      required: true,
    },
  },
  setup(props) {
    const authStore = useAuthStore()
    const followStore = useFollowStore()
    const following = ref(false)
    const cannotFollow = ref(false)

    const accountUrl = props.account.url

    const followUser = async () => {
      try {
        await mastodonService.followUser(props.account)
        followStore.addFollower(props.account.id)
        following.value = true
      } catch (error) {
        console.error(error)
      }
    }

    const checkRelationship = async () => {
      following.value = followStore.isFollowing(props.account.id)
    }

    watch(
      () => [authStore.instanceUrl, authStore.accessToken, props.account],
      () => {
        checkRelationship()
      },
      { immediate: true },
    )

    return {
      following,
      followUser,
      accountUrl,
      toot: props.toot,
    }
  },
})
</script>

<template>
  <Card>
    <template #title>
      <div class="profile-header">
        <Avatar :image="account.avatar" shape="circle" />
        <div class="profile-info">
          <a :href="accountUrl" target="_blank" class="display-name">{{
            account.display_name || account.username
          }}</a>
          <span class="acct">@{{ account.acct }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <Toot :toot="toot" />
      <div class="actions">
        <Button
          v-if="!following"
          label="Follow"
          icon="pi pi-plus"
          @click="followUser"
        />
        <Button
          v-else-if="following"
          label="Following"
          icon="pi pi-check"
          class="p-button-success"
          disabled
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
}
.profile-info {
  margin-left: 0.5rem;
}
.display-name {
  font-weight: bold;
  color: var(--md-indigo-primary-color);
  text-decoration: none;
}
.acct {
  color: #aaa;
  margin-left: 0.5rem;
}
.actions {
  margin-top: 1rem;
  display: flex;
  align-items: center;
}
.cannot-follow-text {
  color: red;
  font-weight: bold;
}
</style>
