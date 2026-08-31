import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { IUserPreferences } from '~/interfaces/preferences'
import type { Weekdays } from '~/interfaces/event'
import type { IScheduleRankingPreferences } from '~~/shared/domain/types/preferences'

export const DEFAULT_SCHEDULE_RANKING: IScheduleRankingPreferences = {
  freeDays: [],
  rankingPriority: 'FEWER_DAYS',
  avoidSingleClassDays: false,
  minimizeGaps: true,
  minimizeDays: true,
}

export const useUserPreferencesStore = defineStore('user-preferences', () => {
  const preferences = ref<IUserPreferences>()

  const weekDays = computed(
    () =>
      preferences.value?.weekDays ??
      ([0, 1, 2, 3, 4, 5, 6] satisfies Weekdays[]),
  )
  const crossings = computed(() => preferences.value?.crossings ?? 0)
  const maxGenerationHistory = computed(
    () => preferences.value?.maxGenerationHistory ?? 5,
  )
  const scheduleRanking = computed(
    () => preferences.value?.scheduleRanking ?? DEFAULT_SCHEDULE_RANKING,
  )

  return {
    preferences,
    weekDays,
    crossings,
    maxGenerationHistory,
    scheduleRanking,
  }
})
