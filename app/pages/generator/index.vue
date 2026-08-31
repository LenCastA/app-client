<template>
  <schedules-presentation
    v-model:dialog="openMySchedules"
    color="blue"
    title="Generados"
    empty-message="Usted no tiene horarios generados"
    :schedules="result?.schedules ?? []"
    path="/skd"
  >
    <template #top-items-right>
      <div class="d-flex align-self-center ga-2">
        <v-toolbar-title>
          Generados
          <v-badge
            color="white"
            :content="result?.schedules.length ?? 0"
            inline
          />
        </v-toolbar-title>
      </div>
    </template>
    <template #top-items-left="{ item }">
      <schedule-favorite-add
        v-if="item"
        :favorites-schedules="myFavoritesSchedules"
        :schedule="item"
        @click:add-favorite="addFavorite"
        @click:remove-favorite="removeFavorite"
      />
      <base-snackbar v-model="showAddFavoriteMessage">
        Horario agregado a favoritos!
      </base-snackbar>
      <base-snackbar v-model="showRemoveFavoriteMessage">
        Horario eliminado de favoritos!
      </base-snackbar>
    </template>
    <template #subtitle-items>
      <schedule-generator-actions
        :crossings="crossingSubjects"
        :schedule-ranking="localScheduleRanking"
        :has-results="!!result"
        :loading-generate="loadingGenerate"
        @update:crossings="updateCrossings"
        @update:schedule-ranking="updateLocalScheduleRanking"
        @click:generate="generateAllUserSchedules"
      />
      <base-snackbar v-model="succces">
        Horarios generados correctamente!
      </base-snackbar>
      <base-snackbar v-model="showGenerationError">
        {{ generationError }}
      </base-snackbar>
      <v-spacer />
    </template>

    <template #summary="{ item }">
      <ScheduleRankingSummary
        v-if="item && rankingByScheduleKey.get(item.scheduleSubjectKey)"
        :metrics="rankingByScheduleKey.get(item.scheduleSubjectKey)!"
        :position="schedulePosition(item.scheduleSubjectKey)"
        :total="result?.schedules.length ?? 0"
      />
    </template>

    <template #emptyBody>
      <template v-if="result">
        <v-alert
          v-for="warning in filterWarnings"
          :key="warning"
          prominent
          type="warning"
          class="mb-2"
        >
          {{ warning }}
        </v-alert>
        <v-alert v-if="generatedBeforeFilters === 0" prominent type="error">
          <v-row align="center">
            <v-col class="grow">
              Lo sentimos, no hemos encontrado horarios para usted.
            </v-col>
          </v-row>
        </v-alert>
        <occurrences-list
          v-if="generatedBeforeFilters === 0"
          :items="result?.occurrences ?? []"
        />
      </template>
    </template>
  </schedules-presentation>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import SchedulesPresentation from '~/components/SchedulesPresentation.vue'
import ScheduleFavoriteAdd from '~/components/schedule/FavoriteToggle.vue'
import OccurrencesList from '~/components/schedule/OccurrencesList.vue'
import { useUserPreferencesStore } from '~/stores/user-preferences'
import { useUserProfileStore } from '~/stores/user-profile'
import { useGenerationStore } from '~/stores/generation'
import { useUserEventsStore } from '~/stores/user-events'
import type { IGeneratedSchedule } from '~/interfaces/schedule'
import { useUserFavoriteSchedules } from '~/composables/user-favorite-schedules'
import ScheduleRankingSummary from '~/components/schedule/RankingSummary.vue'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'
import {
  cloneScheduleRanking,
  getScheduleRankingMetrics,
  rankSchedules,
  type ScheduleFilterDiagnostics,
} from '~/utils/schedule-ranking'
import { WEEK_DAYS_NAMES } from '~/constants/weekdays'

useSeoMeta({
  title: 'Generador - Generador de Horarios',
  description: 'Genera tus horarios de clases de manera automática',
})

const preferencesStore = useUserPreferencesStore()
const profileStore = useUserProfileStore()
const subjectsStore = useUserSubjectsStore()
const favoritesStore = useUserFavoritesStore()
const generationStore = useGenerationStore()
const eventsStore = useUserEventsStore()
const openMySchedules = ref(false)
const succces = ref(false)
const generationError = ref('')
const showGenerationError = ref(false)

const { subjects: mySubjects } = storeToRefs(subjectsStore)
const { favoritesSchedules: myFavoritesSchedules } = storeToRefs(favoritesStore)

const { setResult } = useGeneration()
const { updateCrossings, updateScheduleRanking } = useUserPreferences()
const {
  weekDays,
  crossings: crossingSubjects,
  scheduleRanking,
} = storeToRefs(preferencesStore)
const { hourlyLoad } = storeToRefs(profileStore)
const { result } = storeToRefs(generationStore)
const { items: myEvents } = storeToRefs(eventsStore)

const showAddFavoriteMessage = ref(false)

const { saveNewFavoriteSchedule, deleteFavoriteScheduleById } =
  useUserFavoriteSchedules()

const addFavorite = async (schedule: IGeneratedSchedule) => {
  showAddFavoriteMessage.value = false
  await saveNewFavoriteSchedule(toRaw(schedule))
  showAddFavoriteMessage.value = true
}

const showRemoveFavoriteMessage = ref(false)
const removeFavorite = async (schedule: IGeneratedSchedule) => {
  showRemoveFavoriteMessage.value = false
  await deleteFavoriteScheduleById(schedule.id)
  showRemoveFavoriteMessage.value = true
}

const { loadSchedules } = useSchedulesGenerator()
const loadingGenerate = ref(false)
const localScheduleRanking = ref<IScheduleRankingPreferences>(
  cloneScheduleRanking(scheduleRanking.value),
)
const filteredOut = ref(0)
const generatedBeforeFilters = ref(0)
const filterDiagnostics = ref<ScheduleFilterDiagnostics>({
  evaluatedCount: 0,
  freeDays: [],
  tooEarlyCount: 0,
  tooLateCount: 0,
  tooManyDaysCount: 0,
  tooMuchTotalGapCount: 0,
  tooLargeSingleGapCount: 0,
  tooManyConsecutiveCount: 0,
})

watch(
  scheduleRanking,
  (value) => {
    localScheduleRanking.value = cloneScheduleRanking(value)
  },
  { deep: true },
)

const updateLocalScheduleRanking = (value: IScheduleRankingPreferences) => {
  localScheduleRanking.value = cloneScheduleRanking(value)
}

const rankingByScheduleKey = computed(() => {
  return new Map(
    (result.value?.schedules ?? []).map((schedule) => [
      schedule.scheduleSubjectKey,
      getScheduleRankingMetrics(schedule, localScheduleRanking.value),
    ]),
  )
})

const schedulePosition = (scheduleSubjectKey: string) =>
  (result.value?.schedules.findIndex(
    (schedule) => schedule.scheduleSubjectKey === scheduleSubjectKey,
  ) ?? -1) + 1

const filterWarnings = computed(() => {
  const diagnostics = filterDiagnostics.value
  const total = diagnostics.evaluatedCount
  if (total === 0 || filteredOut.value === 0) return []

  const warnings: string[] = []
  for (const freeDay of diagnostics.freeDays) {
    if (freeDay.rejectedCount === total) {
      warnings.push(
        `No es posible dejar ${WEEK_DAYS_NAMES[freeDay.day]} libre: todas las combinaciones tienen clases ese día.`,
      )
    }
  }
  if (
    localScheduleRanking.value.earliestStartTime &&
    diagnostics.tooEarlyCount === total
  ) {
    warnings.push(
      `Ninguna combinación puede iniciar a las ${localScheduleRanking.value.earliestStartTime} o después. El inicio más tardío disponible es ${diagnostics.latestPossibleStartTime ?? 'desconocido'}.`,
    )
  }
  const limits = [
    {
      enabled: localScheduleRanking.value.maxOccupiedDays !== undefined,
      rejected: diagnostics.tooManyDaysCount,
      message: `No es posible limitar las clases a ${localScheduleRanking.value.maxOccupiedDays} días. El mínimo disponible es ${diagnostics.minimumPossibleDays}.`,
    },
    {
      enabled: localScheduleRanking.value.maxTotalGapMinutes !== undefined,
      rejected: diagnostics.tooMuchTotalGapCount,
      message: `Ninguna combinación cumple el máximo total de huecos. El mínimo disponible es ${diagnostics.minimumPossibleTotalGapMinutes} minutos.`,
    },
    {
      enabled: localScheduleRanking.value.maxSingleGapMinutes !== undefined,
      rejected: diagnostics.tooLargeSingleGapCount,
      message: `Ninguna combinación cumple el máximo por hueco. El menor máximo disponible es ${diagnostics.minimumPossibleMaxSingleGapMinutes} minutos.`,
    },
    {
      enabled: localScheduleRanking.value.maxConsecutiveMinutes !== undefined,
      rejected: diagnostics.tooManyConsecutiveCount,
      message: `Ninguna combinación cumple el máximo de clases seguidas. El menor máximo disponible es ${diagnostics.minimumPossibleMaxConsecutiveMinutes} minutos.`,
    },
  ]
  for (const limit of limits)
    if (limit.enabled && limit.rejected === total) warnings.push(limit.message)
  if (
    localScheduleRanking.value.latestEndTime &&
    diagnostics.tooLateCount === total
  ) {
    warnings.push(
      `Ninguna combinación puede terminar a las ${localScheduleRanking.value.latestEndTime} o antes. La salida más temprana disponible es ${diagnostics.earliestPossibleEndTime ?? 'desconocida'}.`,
    )
  }
  if (warnings.length === 0 && filteredOut.value === total) {
    warnings.push(
      `Cada filtro es posible por separado, pero ninguna de las ${generatedBeforeFilters.value} combinaciones cumple todos al mismo tiempo. Prueba retirar un día libre o ampliar el rango horario.`,
    )
  }
  return warnings
})

const generateAllUserSchedules = async (
  crossings: number,
  rankingPreferences: IScheduleRankingPreferences,
) => {
  succces.value = false
  showGenerationError.value = false
  loadingGenerate.value = true
  try {
    localScheduleRanking.value = cloneScheduleRanking(rankingPreferences)
    const { occurrences: occurrencesData, combinations } = await loadSchedules(
      mySubjects.value,
      myEvents.value,
      {
        crossingSubjects: crossings,
      },
    )
    const ranking = rankSchedules(combinations, rankingPreferences)
    generatedBeforeFilters.value = combinations.length
    filteredOut.value = ranking.filteredOut
    filterDiagnostics.value = ranking.diagnostics

    await updateScheduleRanking(rankingPreferences)
    await setResult(
      toRaw(ranking.ranked.map(({ schedule }) => schedule)),
      toRaw(occurrencesData),
      {
        crossingsSetting: crossings,
        weekDays: toRaw(weekDays.value),
        hourlyLoadId: toRaw(hourlyLoad.value)?.id ?? 0,
        scheduleRanking: cloneScheduleRanking(rankingPreferences),
      },
    )
    succces.value = true
  } catch (error) {
    generationError.value =
      error instanceof Error
        ? error.message
        : 'No se pudieron generar los horarios. Inténtalo nuevamente.'
    showGenerationError.value = true
  } finally {
    loadingGenerate.value = false
  }
}
</script>
