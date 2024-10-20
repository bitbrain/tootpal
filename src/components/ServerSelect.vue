<script lang="ts">
import { defineComponent, ref, watch, computed, onMounted } from 'vue'
import mastodonService, {
  type MastodonInstance,
} from '@/services/mastodonService'
import Select from 'primevue/select'
import { formatNumber } from '@/services/utils'

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
    const selectedServer = ref<string | null>(
      props.modelValue ? props.modelValue.replace(/^https?:\/\//, '') : '',
    )

    const fetchServers = async () => {
      try {
        servers.value = await mastodonService.listServers()
        if (servers.value.length > 0 && !selectedServer.value) {
          selectedServer.value = servers.value[0].domain
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error)
      }
    }

    onMounted(() => {
      fetchServers()
    })

    watch(selectedServer, value => {
      const fullUrl = value
        ? value.startsWith('http')
          ? value
          : `https://${value}`
        : null
      emit('update:modelValue', fullUrl)
    })

    watch(
      () => props.modelValue,
      newValue => {
        selectedServer.value = newValue
          ? newValue.replace(/^https?:\/\//, '')
          : ''
      },
    )

    const serverOptions = computed(() => {
      return servers.value.map(server => ({
        label: `${server.domain} ${
          server.total_users
            ? `(${formatNumber(server.total_users)} users)`
            : ''
        }`,
        value: server.domain,
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
      placeholder="Select or enter a server"
      :filter="true"
      :editable="true"
      :showClear="true"
    ></Select>
  </div>
</template>
