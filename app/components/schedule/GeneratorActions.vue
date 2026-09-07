<template>
  <v-text-field
    v-model="internalCrossings"
    class="cross-input"
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
  <ScheduleRankingFilters
    :model-value="internalRanking"
    :disabled="loadingGenerate"
    @apply="onApplyRanking"
  />
  <v-btn
    color="success"
    theme="dark"
    rounded
    variant="flat"
    density="comfortable"
    :loading="loadingGenerate"
    @click="onClickGenerate"
  >
    <v-icon> {{ mdiUpdate }} </v-icon>
    {{ hasResults ? 'Regenerar' : 'Generar' }}
  </v-btn>
</template>

<script setup lang="ts">
import { mdiHelpCircle, mdiUpdate } from '@mdi/js'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'
import ScheduleRankingFilters from './RankingFilters.vue'
import { cloneScheduleRanking } from '~/utils/schedule-ranking'

const normalizeCrossings = (crossings: number) => {
  if (!Number.isFinite(crossings)) return 0
  return Math.min(12, Math.max(0, crossings))
}

const props = defineProps<{
  loadingGenerate: boolean
  crossings: number
  scheduleRanking: IScheduleRankingPreferences
  hasResults?: boolean
}>()
const emit = defineEmits<{
  (event: 'update:crossings', crossings: number): void
  (
    event: 'update:schedule-ranking',
    scheduleRanking: IScheduleRankingPreferences,
  ): void
  (
    event: 'click:generate',
    crossings: number,
    scheduleRanking: IScheduleRankingPreferences,
  ): void
}>()

const internalCrossings = ref(normalizeCrossings(props.crossings))
const internalRanking = ref(cloneScheduleRanking(props.scheduleRanking))

watch(
  () => props.crossings,
  (crossings) => {
    internalCrossings.value = normalizeCrossings(crossings)
  },
)

watch(
  () => props.scheduleRanking,
  (scheduleRanking) => {
    internalRanking.value = cloneScheduleRanking(scheduleRanking)
  },
  { deep: true },
)

const onUpdateCrossings = (crossings: number | string | null) => {
  if (crossings === null) return
  const normalized = normalizeCrossings(Number(crossings))
  internalCrossings.value = normalized
  emit('update:crossings', normalized)
}

const onClickGenerate = () => {
  if (props.loadingGenerate) return
  emit(
    'click:generate',
    internalCrossings.value,
    cloneScheduleRanking(internalRanking.value),
  )
}

const onApplyRanking = (scheduleRanking: IScheduleRankingPreferences) => {
  if (props.loadingGenerate) return
  internalRanking.value = cloneScheduleRanking(scheduleRanking)
  emit('update:schedule-ranking', cloneScheduleRanking(scheduleRanking))
  onClickGenerate()
}
</script>

<style scoped>
.cross-input {
  flex: 0 0 14rem;
  width: 14rem;
}

@media (max-width: 600px) {
  .cross-input {
    flex-basis: 100%;
    width: 100%;
  }
}
</style>
