<template>
  <v-text-field
    v-model.number="internalCrossings"
    class="cross-input"
    label="Máximo de cruces"
    hide-details
    density="compact"
    max="5"
    min="0"
    type="number"
    @update:model-value="onUpdateCrossings"
  >
    <template #append-inner>
      <v-menu bottom>
        <template #activator="{ props: activatorProps }">
          <v-icon v-bind="activatorProps">
            {{ mdiHelpCircle }}
          </v-icon>
        </template>
        <v-card max-width="300" density="compact">
          <v-card-text>
            Solo se contabiliza los cruces entre cursos y los horarios con
            cruces entre Práctica y Práctica no se muestran.
          </v-card-text>
        </v-card>
      </v-menu>
    </template>
  </v-text-field>
  <ScheduleRankingFilters v-model="internalRanking" @apply="onApplyRanking" />
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

const internalCrossings = ref(props.crossings)
const internalRanking = ref(cloneScheduleRanking(props.scheduleRanking))

watch(
  () => props.crossings,
  (crossings) => {
    internalCrossings.value = crossings
  },
)

watch(
  () => props.scheduleRanking,
  (scheduleRanking) => {
    internalRanking.value = cloneScheduleRanking(scheduleRanking)
  },
  { deep: true },
)

watch(
  internalRanking,
  (scheduleRanking) => {
    emit('update:schedule-ranking', cloneScheduleRanking(scheduleRanking))
  },
  { deep: true },
)

const onUpdateCrossings = (crossings: string) => {
  emit('update:crossings', Number(crossings))
}

const onClickGenerate = () => {
  emit(
    'click:generate',
    internalCrossings.value,
    cloneScheduleRanking(internalRanking.value),
  )
}

const onApplyRanking = (scheduleRanking: IScheduleRankingPreferences) => {
  internalRanking.value = cloneScheduleRanking(scheduleRanking)
  onClickGenerate()
}
</script>

<style scoped>
.cross-input {
  flex: 0 0 11.5rem;
  width: 11.5rem;
}

@media (max-width: 600px) {
  .cross-input {
    flex-basis: 100%;
    width: 100%;
  }
}
</style>
