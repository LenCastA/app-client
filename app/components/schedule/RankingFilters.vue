<template>
  <v-dialog v-model="dialog" max-width="860" scrollable>
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        :prepend-icon="mdiTuneVariant"
        variant="outlined"
        color="primary"
        rounded
        density="comfortable"
      >
        Filtros y orden
        <v-badge
          v-if="activeFilters > 0"
          :content="activeFilters"
          color="primary"
          inline
        />
      </v-btn>
    </template>

    <v-card class="pa-2">
      <v-card-title class="text-h6 font-weight-bold text-wrap">
        Preferencias del horario
      </v-card-title>
      <v-card-subtitle class="text-wrap pb-4">
        Los límites descartan horarios; las prioridades ordenan los restantes.
      </v-card-subtitle>
      <v-card-text ref="dialogContent" class="pt-4">
        <v-select
          v-model="draft.freeDays"
          :items="dayOptions"
          item-title="title"
          item-value="value"
          label="Días que quiero libres"
          multiple
          chips
          closable-chips
          clearable
          variant="outlined"
          density="comfortable"
        />

        <v-row density="comfortable" class="field-row">
          <v-col cols="12" sm="6">
            <v-combobox
              v-model="draft.earliestStartTime"
              :items="timeOptions"
              label="No iniciar antes de"
              hint="Selecciona una hora o escribe una en formato HH:mm"
              persistent-hint
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-combobox
              v-model="draft.latestEndTime"
              :items="timeOptions"
              label="No terminar después de"
              hint="Selecciona una hora o escribe una en formato HH:mm"
              persistent-hint
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
        </v-row>

        <v-alert v-if="invalidTimeRange" type="warning" variant="tonal">
          La hora de inicio debe ser anterior a la hora máxima de salida.
        </v-alert>
        <v-alert
          v-if="invalidTimeFormat"
          type="warning"
          variant="tonal"
          class="mt-2"
        >
          Las horas escritas manualmente deben usar el formato HH:mm, por
          ejemplo 08:30.
        </v-alert>

        <v-row class="field-row">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model.number="draft.maxOccupiedDays"
              label="Máximo de días con clases"
              type="number"
              min="1"
              max="7"
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="draft.maxTotalGapMinutes"
              :items="gapOptions"
              label="Máximo total de huecos"
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="draft.maxSingleGapMinutes"
              :items="gapOptions"
              label="Máximo por cada hueco"
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="draft.maxConsecutiveMinutes"
              :items="consecutiveOptions"
              label="Máximo de clases seguidas"
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
        </v-row>

        <v-divider class="mt-4 mb-5" />
        <div class="text-subtitle-2 mb-4">
          Preferencias (no descartan horarios)
        </div>
        <v-row class="field-row">
          <v-col cols="12" sm="6">
            <v-combobox
              v-model="draft.preferredStartTime"
              :items="timeOptions"
              label="Preferir iniciar después de"
              hint="Selecciona una hora o escríbela manualmente"
              persistent-hint
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-combobox
              v-model="draft.preferredEndTime"
              :items="timeOptions"
              label="Preferir terminar antes de"
              hint="Selecciona una hora o escríbela manualmente"
              persistent-hint
              clearable
              variant="outlined"
              density="comfortable"
            />
          </v-col>
        </v-row>
        <v-alert
          v-if="invalidPreferredRange"
          type="warning"
          variant="tonal"
          class="mb-2"
        >
          La entrada preferida debe ser anterior a la salida preferida.
        </v-alert>
        <v-select
          v-model="draft.rankingPriority"
          :items="priorityOptions"
          label="Prioridad principal"
          variant="outlined"
          density="comfortable"
        />

        <v-switch
          v-model="draft.minimizeGaps"
          label="Priorizar menos huecos entre clases"
          color="primary"
          hide-details
        />
        <v-switch
          v-model="draft.avoidSingleClassDays"
          label="Evitar ir por un solo bloque de clases"
          color="primary"
          hide-details
        />
        <v-switch
          v-model="draft.minimizeDays"
          label="Priorizar clases concentradas en menos días"
          color="primary"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="reset">Restablecer</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="invalidForm"
          @click="apply"
        >
          Aplicar y regenerar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { mdiTuneVariant } from '@mdi/js'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'
import { WEEK_DAYS_NAMES } from '~/constants/weekdays'
import type { Weekdays } from '~/interfaces/event'
import { DEFAULT_SCHEDULE_RANKING } from '~/stores/user-preferences'
import { cloneScheduleRanking } from '~/utils/schedule-ranking'

const props = defineProps<{ modelValue: IScheduleRankingPreferences }>()
const emit = defineEmits<{
  'update:modelValue': [value: IScheduleRankingPreferences]
  apply: [value: IScheduleRankingPreferences]
}>()

const dialog = ref(false)
const draft = ref(cloneScheduleRanking(props.modelValue))

watch(
  () => props.modelValue,
  (value) => {
    if (!dialog.value) draft.value = cloneScheduleRanking(value)
  },
  { deep: true },
)

watch(dialog, (open) => {
  if (open) {
    draft.value = cloneScheduleRanking(props.modelValue)
    nextTick(() => {
      const value = dialogContent.value
      const content = value instanceof HTMLElement ? value : value?.$el
      if (content instanceof HTMLElement) content.scrollTop = 0
    })
  }
})

const dialogContent = ref<HTMLElement | { $el: HTMLElement }>()

const dayOptions = WEEK_DAYS_NAMES.map((title, value) => ({
  title,
  value: value as Weekdays,
}))

const invalidTimeRange = computed(
  () =>
    !!draft.value.earliestStartTime &&
    !!draft.value.latestEndTime &&
    draft.value.earliestStartTime >= draft.value.latestEndTime,
)
const invalidPreferredRange = computed(
  () =>
    !!draft.value.preferredStartTime &&
    !!draft.value.preferredEndTime &&
    draft.value.preferredStartTime >= draft.value.preferredEndTime,
)
const invalidDays = computed(
  () =>
    draft.value.maxOccupiedDays !== undefined &&
    (draft.value.maxOccupiedDays < 1 || draft.value.maxOccupiedDays > 7),
)
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
const invalidTimeFormat = computed(() =>
  [
    draft.value.earliestStartTime,
    draft.value.latestEndTime,
    draft.value.preferredStartTime,
    draft.value.preferredEndTime,
  ].some((value) => !!value && !timePattern.test(value)),
)
const invalidForm = computed(
  () =>
    invalidTimeRange.value ||
    invalidPreferredRange.value ||
    invalidDays.value ||
    invalidTimeFormat.value,
)
const timeOptions = Array.from({ length: 33 }, (_, index) => {
  const minutes = 6 * 60 + index * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
const durationOptions = (values: number[]) =>
  values.map((value) => ({
    title:
      value === 0
        ? 'Sin huecos'
        : value < 60
          ? `${value} min`
          : `${value / 60} h`,
    value,
  }))
const gapOptions = durationOptions([0, 30, 60, 90, 120, 180, 240])
const consecutiveOptions = durationOptions([60, 120, 180, 240, 300, 360])
const priorityOptions = [
  { title: 'Concentrar en menos días', value: 'FEWER_DAYS' },
  { title: 'Tener menos huecos', value: 'FEWER_GAPS' },
]

const activeFilters = computed(
  () =>
    props.modelValue.freeDays.length +
    Number(!!props.modelValue.earliestStartTime) +
    Number(!!props.modelValue.latestEndTime) +
    Number(props.modelValue.maxOccupiedDays !== undefined) +
    Number(props.modelValue.maxTotalGapMinutes !== undefined) +
    Number(props.modelValue.maxSingleGapMinutes !== undefined) +
    Number(props.modelValue.maxConsecutiveMinutes !== undefined),
)

const reset = () => {
  draft.value = cloneScheduleRanking(DEFAULT_SCHEDULE_RANKING)
}

const apply = () => {
  const value = cloneScheduleRanking(draft.value)
  emit('update:modelValue', value)
  emit('apply', value)
  dialog.value = false
}
</script>

<style scoped>
.field-row {
  margin-bottom: 0.75rem;
}
</style>
