<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import TootCard from './TootCard.vue'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'

export default defineComponent({
  name: 'Results',
  components: {
    TootCard,
    Button,
    Paginator,
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

    const paginatedResults = computed(() => {
      const start = first.value
      const end = start + rows.value
      return displayedResults.slice(start, end)
    })

    const onPageChange = (event: any) => {
      first.value = event.first
      rows.value = event.rows
    }

    const toggleHidden = () => {
      showHidden.value = !showHidden.value
      first.value = 0 // Reset pagination
    }

    const hiddenMessage = computed(() => {
      return `${0} profiles are hidden because they are already followed or cannot be followed.`
    })

    const hiddenMessageShown = computed(() => {
      return `${0} additional profiles shown that are either followed or cannot be followed.`
    })

    return {
      displayedResults,
      paginatedResults,
      toggleHidden,
      showHidden,
      first,
      rows,
      onPageChange,
      hiddenMessage,
      hiddenMessageShown,
    }
  },
})
</script>

<template>
  <div>
    <p v-if="1 > 0">
      {{ showHidden ? hiddenMessageShown : hiddenMessage }}
      <Button
        :label="showHidden ? 'Hide Profiles' : 'Show All'"
        @click="toggleHidden"
        class="p-button-text"
      />
    </p>
    <div class="p-grid">
      <div
        class="p-col-12"
        v-for="item in paginatedResults"
        :key="item.account.id"
      >
        <TootCard :account="item.account" :toot="item.toot" />
      </div>
    </div>
    <Paginator
      :first="first"
      :rows="rows"
      :totalRecords="displayedResults.length"
      @page="onPageChange"
      :rowsPerPageOptions="[10, 20, 50]"
    />
  </div>
</template>
