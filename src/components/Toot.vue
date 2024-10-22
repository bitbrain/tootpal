<script lang="ts">
import { defineComponent } from 'vue'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'

export default defineComponent({
  name: 'Toot',
  components: {
    Avatar,
    Button,
  },
  props: {
    toot: {
      type: Object as () => any,
      required: true,
    },
  },
  setup(props) {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    }

    const accountUrl = props.toot.account?.url || '#'

    return {
      formatDate,
      accountUrl,
      toot: props.toot,
    }
  },
})
</script>

<template>
  <div class="toot" v-if="toot && toot.account">
    <div v-html="toot.content" class="toot-text"></div>
    <div v-if="toot.media_attachments.length > 0" class="media-attachments">
      <img
        v-for="media in toot.media_attachments"
        :key="media.id"
        :src="media.preview_url"
        :alt="media.description || 'Attachment'"
      />
    </div>
  </div>
</template>

<style scoped>
.toot-text {
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: rgb(from white r g b / 0.65);
}

.media-attachments img {
  max-width: 100%;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
}
</style>
