<template>
  <v-data-table
    :headers="headers"
    :items="itemsSync"
    :group-by="[{ key: 'name' }]"
    class="occurrences-table"
    density="comfortable"
  >
    <template #[`header.data-table-group`]>
      <span class="d-sr-only">Agrupación</span>
    </template>
    <template #[`item.type`]="{ item }">
      <div class="occurrence-reason">
        <v-icon
          :color="occurrencePresentation(item.type).color"
          :icon="occurrencePresentation(item.type).icon"
          size="small"
        />
        <div>
          <div class="occurrence-reason__label">
            {{ occurrencePresentation(item.type).label }}
          </div>
          <div class="occurrence-reason__duration text-medium-emphasis">
            {{ crossingDuration(item) }} de cruce
          </div>
        </div>
      </div>
    </template>
    <template #[`item.eventTarget.title`]="{ item }">
      <div class="course-detail">
        <strong>{{ item.eventTarget.title }}</strong>
        <div class="course-detail__session text-medium-emphasis">
          {{ eventTypeLabel(item.eventTarget.type) }} ·
          {{ WEEK_DAYS_NAMES[item.eventTarget.day] }}
        </div>
        <span>{{ timeRange(item.eventTarget) }}</span>
      </div>
    </template>
    <template #[`item.eventSource.title`]="{ item }">
      <div class="course-detail">
        <strong>{{ item.eventSource.title }}</strong>
        <div class="course-detail__session text-medium-emphasis">
          {{ eventTypeLabel(item.eventSource.type) }} ·
          {{ WEEK_DAYS_NAMES[item.eventSource.day] }}
        </div>
        <span>{{ timeRange(item.eventSource) }}</span>
      </div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { WEEK_DAYS_NAMES } from '~/constants/weekdays'
import type { IIntersectionOccurrence } from '~/interfaces/ocurrences'
import {
  eventTypeLabel,
  occurrencePresentation,
} from '~/utils/occurrences-presentation'
import {
  crossingDurationHours,
  formatCrossingDuration,
} from '~/utils/schedule-crossing'

const itemsSync = defineModel<IIntersectionOccurrence[]>('items')

const headers = [
  { title: 'Motivo', align: 'start', value: 'type', width: 260 },
  {
    title: 'Curso A',
    value: 'eventTarget.title',
    groupable: false,
  },
  {
    title: 'Curso B',
    value: 'eventSource.title',
    groupable: false,
  },
] as const

const crossingDuration = (item: IIntersectionOccurrence) =>
  formatCrossingDuration(
    crossingDurationHours(item.eventTarget, item.eventSource),
  )

const timeRange = (event: IIntersectionOccurrence['eventTarget']) =>
  `${event.startTime.slice(0, 5)} - ${event.endTime.slice(0, 5)}`
</script>

<style scoped>
.occurrences-table :deep(.v-data-table-group-header-row) {
  font-weight: 500;
}

.occurrences-table :deep(table) {
  width: 100%;
  table-layout: fixed;
}

.occurrences-table :deep(thead th:first-child),
.occurrences-table
  :deep(tbody tr:not(.v-data-table-group-header-row) td:first-child) {
  width: 44px;
  min-width: 44px;
  padding-inline: 8px;
}

.occurrence-reason {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  padding-block: 12px;
}

.occurrence-reason__label {
  line-height: 1.35;
}

.occurrence-reason__duration {
  margin-top: 3px;
  font-size: 0.8125rem;
}

.course-detail {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding-block: 12px;
  line-height: 1.35;
}

.course-detail strong {
  overflow-wrap: anywhere;
}

.course-detail span,
.course-detail__session {
  font-size: 0.8125rem;
}
</style>
