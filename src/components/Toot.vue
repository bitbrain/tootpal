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
  margin-top: 0.25rem;
  color: var(--tp-text);
  font-size: 0.95rem;
  line-height: 1.55;
}
.toot-text :deep(p) {
  margin: 0.25rem 0;
}
.toot-text :deep(a) {
  color: var(--tp-link);
}
.toot-text :deep(.hashtag),
.toot-text :deep(.mention) {
  color: var(--tp-link);
}
.toot-text :deep(blockquote) {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--tp-border);
  color: var(--tp-text-muted);
  background: rgba(255,255,255,0.02);
}

.media-attachments img {
  max-width: 100%;
  border-radius: 8px;
  margin-top: 0.5rem;
}
</style>
