<template>
  <div class="ranking-summary" aria-label="Resumen del horario generado">
    <div class="ranking-position">
      <v-icon :icon="mdiSortAscending" size="18" />
      <strong>Horario {{ position }} de {{ total }}</strong>
    </div>

    <div class="ranking-metrics">
      <span class="ranking-metric">
        <v-icon :icon="mdiCalendarWeek" size="17" />
        {{ metrics.occupiedDays }} días con clases
      </span>
      <span class="ranking-metric">
        <v-icon :icon="mdiClockOutline" size="17" />
        {{ formattedGaps }}
      </span>
      <span class="ranking-metric">
        <v-icon :icon="mdiClockTimeFourOutline" size="17" />
        {{ metrics.earliestStartTime ?? '--:--' }}–{{
          metrics.latestEndTime ?? '--:--'
        }}
      </span>
      <span v-if="metrics.singleClassDays" class="ranking-metric">
        <v-icon :icon="mdiCalendarAccount" size="17" />
        {{ metrics.singleClassDays }}
        {{ metrics.singleClassDays === 1 ? 'día' : 'días' }} con un solo bloque
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  mdiCalendarAccount,
  mdiCalendarWeek,
  mdiClockOutline,
  mdiClockTimeFourOutline,
  mdiSortAscending,
} from '@mdi/js'
import type { ScheduleRankingMetrics } from '~/utils/schedule-ranking'

const props = defineProps<{
  metrics: ScheduleRankingMetrics
  position: number
  total: number
}>()

const formattedGaps = computed(() => {
  if (props.metrics.gapMinutes === 0) return 'Sin huecos'
  const hours = Math.floor(props.metrics.gapMinutes / 60)
  const minutes = props.metrics.gapMinutes % 60
  const duration = `${hours ? `${hours} h` : ''}${hours && minutes ? ' ' : ''}${minutes ? `${minutes} min` : ''}`
  return `${duration} de huecos`
})
</script>

<style scoped>
.ranking-summary {
  display: flex;
  width: min(100%, 62rem);
  align-items: center;
  gap: 1rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
  border-radius: 0.75rem;
  background: rgba(var(--v-theme-primary), 0.07);
  color: rgb(var(--v-theme-on-surface));
}

.ranking-position,
.ranking-metric,
.ranking-metrics {
  display: flex;
  align-items: center;
}

.ranking-position {
  flex-shrink: 0;
  gap: 0.4rem;
  color: rgb(var(--v-theme-primary));
}

.ranking-metrics {
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
}

.ranking-metric {
  gap: 0.35rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .ranking-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
