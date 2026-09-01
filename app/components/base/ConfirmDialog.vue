<template>
  <v-dialog v-model="internalValue" :persistent="loading" max-width="500px">
    <v-card>
      <v-card-title class="text-headline-medium">
        <slot name="title">
          <v-icon left>{{ mdiAlertCircle }}</v-icon>
          {{ title }}
        </slot>
      </v-card-title>
      <v-divider class="mb-4"></v-divider>
      <v-card-text class="text-headline-small">
        <slot></slot>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="blue-darken-1"
          variant="flat"
          :disabled="loading"
          @click="emit('click:reject', $event)"
        >
          {{ rejectText }}
        </v-btn>
        <v-btn
          color="blue-darken-1"
          variant="text"
          :loading="loading"
          @click="emit('click:confirm', $event)"
        >
          {{ confirmText }}
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="closeable"
          color="blue-darken-1"
          variant="text"
          :disabled="loading"
          @click="internalValue = false"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { mdiAlertCircle } from '@mdi/js'
withDefaults(
  defineProps<{
    title?: string
    confirmText?: string
    rejectText?: string
    closeable?: boolean
    loading?: boolean
  }>(),
  {
    title: 'Atención',
    confirmText: 'Si',
    rejectText: 'No',
    closeable: false,
    loading: false,
  },
)
const emit = defineEmits<{
  (event: 'click:confirm' | 'click:reject', value: MouseEvent): void
}>()

const internalValue = defineModel<boolean>({
  default: false,
})
</script>
