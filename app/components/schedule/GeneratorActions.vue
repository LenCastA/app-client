<template>
  <v-text-field
    v-model="internalCrossings"
    class="flex-sm-1-1 flex-1-1-100 cross-input"
    label="Horas de cruce permitidas"
    type="number"
    min="0"
    max="12"
    step="0.5"
    hide-details
    density="compact"
    @update:model-value="onUpdateCrossings"
  >
    <template #append-inner>
      <v-menu bottom>
        <template #activator="{ props: activatorProps }">
          <v-icon v-bind="activatorProps">{{ mdiHelpCircle }}</v-icon>
        </template>
        <v-card max-width="300" density="compact">
          <v-card-text>
            Se suman las horas superpuestas entre teoría-teoría y
            teoría-práctica. Los cruces entre prácticas no se permiten.
          </v-card-text>
        </v-card>
      </v-menu>
    </template>
  </v-text-field>
  <v-btn
    color="success"
    theme="dark"
    rounded
    variant="flat"
    density="comfortable"
    :loading="loadingGenerate"
    @click="onClickGenerate"
  >
    <v-icon>{{ mdiUpdate }}</v-icon>
    Generar
  </v-btn>
</template>

<script setup lang="ts">
import { mdiHelpCircle, mdiUpdate } from '@mdi/js'

const normalizeCrossings = (crossings: number) => {
  if (!Number.isFinite(crossings)) return 0
  return Math.min(12, Math.max(0, crossings))
}

const props = defineProps<{
  loadingGenerate: boolean
  crossings: number
}>()
const emit = defineEmits<{
  (event: 'update:crossings' | 'click:generate', crossings: number): void
}>()

const internalCrossings = ref(normalizeCrossings(props.crossings))

watch(
  () => props.crossings,
  (crossings) => {
    internalCrossings.value = normalizeCrossings(crossings)
  },
)

const onUpdateCrossings = (crossings: number | string | null) => {
  if (crossings === null) return
  const normalized = normalizeCrossings(Number(crossings))
  internalCrossings.value = normalized
  emit('update:crossings', normalized)
}

const onClickGenerate = () => {
  emit('click:generate', internalCrossings.value)
}
</script>
