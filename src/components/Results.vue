<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import TootCard from './TootCard.vue'
import Button from 'primevue/button'

export default defineComponent({
  name: 'Results',
  components: {
    TootCard,
    Button,
  },
  props: {
    results: {
      type: Array as () => { account: any; toot: any; accountId: string }[],
      required: true,
    },
  },
  setup(props) {
    const showHidden = ref(false)
    const first = ref(0)
    const rows = ref(10)

    const displayedResults = props.results

    const onPageChange = (event: any) => {
      first.value = event.first
      rows.value = event.rows
    }

    const toggleHidden = () => {
      showHidden.value = !showHidden.value
      first.value = 0 // Reset pagination
    }

    return {
      displayedResults,
      toggleHidden,
      showHidden,
      first,
      rows,
      onPageChange,
    }
  },
})
</script>

<template>
  <div>
    <div class="p-grid">
      <div
        class="p-col-12"
        v-for="item in displayedResults"
        :key="item.account.id"
      >
        <TootCard :account="item.account" :toot="item.toot" />
      </div>
    </div>
  </div>
</template>
