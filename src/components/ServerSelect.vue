<script lang="ts">
import { defineComponent, ref, watch, computed, onMounted } from 'vue'
import mastodonService, {
  type MastodonInstance,
} from '@/services/mastodonService'
import Select from 'primevue/select'

export default defineComponent({
  name: 'ServerSelect',
  components: {
    Select,
  },
  props: {
    modelValue: {
      type: [String, null],
      required: true,
    },
  },
  setup(props, { emit }) {
    const servers = ref<MastodonInstance[]>([])
    const selectedServer = ref<string | null>(props.modelValue)

    const fetchServers = async () => {
      try {
        servers.value = await mastodonService.listServers()
        if (servers.value.length > 0 && !selectedServer.value) {
          selectedServer.value = `https://${servers.value[0].domain}`
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error)
      }
    }

    onMounted(() => {
      fetchServers()
    })

    // Watch for changes in selectedServer and emit
    watch(selectedServer, value => {
      emit('update:modelValue', value)
    })

    // Watch for changes in props.modelValue and update selectedServer
    watch(
      () => props.modelValue,
      newValue => {
        selectedServer.value = newValue
      },
    )

    const serverOptions = computed(() => {
      return servers.value.map(server => ({
        label: server.domain,
        value: `https://${server.domain}`,
      }))
    })

    return {
      servers,
      selectedServer,
      serverOptions,
    }
  },
})
</script>

<template>
  <div>
    <Select
      v-model="selectedServer"
      :options="serverOptions"
      optionLabel="label"
      optionValue="value"
      placeholder="Select a server"
      :filter="true"
      :showClear="true"
    ></Select>
  </div>
</template>
