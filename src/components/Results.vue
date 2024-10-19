<template>
  <div>
    <p v-if="hiddenCount > 0">
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

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import TootCard from './TootCard.vue'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'
import { useAuthStore } from '@/stores/authStore'
import mastodonService from '@/services/mastodonService'

export default defineComponent({
  name: 'Results',
  components: {
    TootCard,
    Button,
    Paginator,
  },
  props: {
    results: {
      type: Array as () => { account: any; toot: any }[],
      required: true,
    },
  },
  setup(props) {
    const authStore = useAuthStore()
    const showHidden = ref(false)
    const relationships = ref(new Map<string, any>())
    const first = ref(0)
    const rows = ref(10)

    const accounts = computed(() => props.results.map(item => item.account))

    const fetchRelationships = async () => {
      relationships.value = await mastodonService.getRelationships(
        accounts.value,
        authStore.instanceUrl!,
        authStore.accessToken!,
      )
    }

    watch(
      () => props.results,
      () => {
        fetchRelationships()
      },
      { immediate: true },
    )

    const hiddenResults = computed(() => {
      return props.results.filter(item => {
        const relationship = relationships.value.get(item.account.acct)
        return relationship && (relationship.following || relationship.blocked)
      })
    })

    const hiddenCount = computed(() => hiddenResults.value.length)

    const displayedResults = computed(() => {
      if (showHidden.value) {
        return props.results
      }
      return props.results.filter(item => {
        const relationship = relationships.value.get(item.account.acct)
        return !(
          relationship &&
          (relationship.following || relationship.blocked)
        )
      })
    })

    const paginatedResults = computed(() => {
      const start = first.value
      const end = start + rows.value
      return displayedResults.value.slice(start, end)
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
      return `${hiddenCount.value} profiles are hidden because they are already followed or cannot be followed.`
    })

    const hiddenMessageShown = computed(() => {
      return `${hiddenCount.value} additional profiles shown that are either followed or cannot be followed.`
    })

    return {
      displayedResults,
      paginatedResults,
      hiddenCount,
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
