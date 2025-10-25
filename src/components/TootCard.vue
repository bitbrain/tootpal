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
    const followStore = useFollowStore()
    const following = ref(false)

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

    const checkFollowing = async () => {
      following.value = followStore.isFollowing(props.account.id)
    }

    watch(
      () => [props.account],
      () => {
        checkFollowing()
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
  <div class="toot-card">
    <div class="header">
      <div class="profile">
        <Avatar class="avatar" :image="account.avatar" shape="circle" /><a
          :href="accountUrl"
          target="_blank"
          class="display-name"
          >{{ account.display_name || account.username
          }}{{ `@${account.acct}` }}</a
        >
      </div>

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
    </div>

    <div class="bio" v-html="account.note"></div>

    <Toot :toot="toot" />
  </div>
</template>

<style scoped>
::v-deep p {
  margin: 0;
}
.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.toot-card {
  padding: 0.875rem 1rem;
  background: var(--tp-card);
  border: 1px solid var(--tp-border);
  border-radius: 12px;
  margin-bottom: 0.75rem;
}
.profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.avatar :deep(img) {
  width: 46px;
  height: 46px;
}
.display-name {
  color: var(--tp-text);
  font-weight: 700;
}
.bio {
  font-size: 0.95rem;
  color: var(--tp-text-muted);
  margin: 0.25rem 0 0.75rem;
}
</style>
