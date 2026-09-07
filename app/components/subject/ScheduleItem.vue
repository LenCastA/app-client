<template>
  <div class="section-selection">
    <v-checkbox
      :model-value="allSelected"
      :indeterminate="selectedCount > 0 && !allSelected"
      :disabled="loading || schedules.length === 0"
      label="Seleccionar todas las secciones"
      color="primary"
      density="compact"
      hide-details
      @update:model-value="selectAll"
    />
    <span class="text-body-2 text-medium-emphasis" aria-live="polite"
      >{{ selectedCount }} de {{ schedules.length }} seleccionadas</span
    >
  </div>
  <p class="text-body-2 text-medium-emphasis mb-3">
    El generador elegirá una de las secciones que marques para este curso.
  </p>
  <v-table class="schedule-table" density="comfortable">
    <thead>
      <tr>
        <th class="text-left">Sección</th>
        <th class="text-left">Día</th>
        <th class="text-left">Horas</th>
        <th class="text-left">Docente</th>
        <th class="text-left">Tipo</th>
        <th class="text-left">Aula</th>
      </tr>
    </thead>
    <tbody v-if="loading">
      <tr v-if="loading">
        <td colspan="6">
          <v-skeleton-loader type="table-row@10" />
        </td>
      </tr>
    </tbody>
    <tbody v-for="schedule in loading ? [] : schedules" :key="schedule.id">
      <ScheduleSection v-model="valueSync" :schedule="schedule" />
      <ClassSessionItem
        v-for="session in schedule.sessions"
        :key="session.id"
        :session="session"
        :for="schedule?.section?.id"
      />
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import ClassSessionItem from '~/components/subject/ClassSessionItem.vue'
import ScheduleSection from '~/components/subject/ScheduleSection.vue'
import type { ISubjectSchedule } from '~/interfaces/subject'

const props = defineProps<{
  schedules: ISubjectSchedule[]
  loading: boolean
}>()

const valueSync = defineModel<ISubjectSchedule[]>({
  required: true,
})
const selectedCount = computed(() => {
  const selectedIds = new Set(valueSync.value.map((schedule) => schedule.id))
  return props.schedules.filter((schedule) => selectedIds.has(schedule.id))
    .length
})
const allSelected = computed(
  () =>
    props.schedules.length > 0 &&
    selectedCount.value === props.schedules.length,
)
const selectAll = (selected: boolean | null) => {
  if (!props.loading) valueSync.value = selected ? [...props.schedules] : []
}
</script>

<style>
.section-selection {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 16px;
}
.section-selection .v-input {
  flex: 0 1 auto;
}
@media (max-width: 600px) {
  .schedule-table thead {
    display: none;
  }
  .schedule-table.v-table > .v-table__wrapper > table {
    display: block;
  }
  .schedule-table tbody {
    display: block;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 8px;
  }
  .schedule-table tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 12px;
  }
  .schedule-table td {
    display: block;
    height: auto !important;
    border: 0 !important;
    padding-block: 4px !important;
  }
  .schedule-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 11px;
    opacity: 0.65;
  }
  .schedule-table .session-teacher,
  .schedule-table .section-cell {
    grid-column: 1 / -1;
  }
  .schedule-table tbody > tr + tr {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
.schedule-table.v-table > .v-table__wrapper > table > tbody > tr > td,
.schedule-table.v-table > .v-table__wrapper > table > tbody > tr > th,
.schedule-table.v-table > .v-table__wrapper > table > thead > tr > td,
.schedule-table.v-table > .v-table__wrapper > table > thead > tr > th,
.schedule-table.v-table > .v-table__wrapper > table > tfoot > tr > td,
.schedule-table.v-table > .v-table__wrapper > table > tfoot > tr > th {
  padding: 0 6px;
}
</style>
