import { storeToRefs } from 'pinia'
import type { Weekdays } from '~/interfaces/event'
import { toPreferencesDto } from '~/mappers/domain/entities'
import type {
  IBasePreferences,
  IScheduleRankingPreferences,
} from '#shared/domain/types/preferences'

export const useUserPreferences = () => {
  const store = useUserPreferencesStore()
  const service = usePreferencesService()
  const userId = useSchedulesUserId()
  const {
    preferences,
    weekDays,
    crossings,
    maxGenerationHistory,
    scheduleRanking,
    loadingPreferences,
  } = storeToRefs(store)

  async function fetchPreferences() {
    loadingPreferences.value = true
    try {
      const prefs = await service.get(userId)
      if (prefs) preferences.value = toPreferencesDto(prefs)
    } finally {
      loadingPreferences.value = false
    }
  }

  async function createPreferences(initial: Partial<IBasePreferences> = {}) {
    preferences.value = toPreferencesDto(await service.create(userId, initial))
  }

  async function updateCrossings(_crossings: number) {
    const result = await service.patch(userId, { crossings: _crossings })
    preferences.value = toPreferencesDto(result)
  }

  async function saveWeekDays(data: Weekdays[]) {
    const result = await service.patch(userId, { weekDays: data })
    preferences.value = toPreferencesDto(result)
  }

  async function updateMaxGenerationHistory(n: number) {
    const result = await service.patch(userId, { maxGenerationHistory: n })
    preferences.value = toPreferencesDto(result)
  }

  async function updateScheduleRanking(data: IScheduleRankingPreferences) {
    const result = await service.patch(userId, { scheduleRanking: data })
    preferences.value = toPreferencesDto(result)
  }

  return {
    preferences,
    weekDays,
    crossings,
    maxGenerationHistory,
    scheduleRanking,
    loadingPreferences,
    fetchPreferences,
    createPreferences,
    updateCrossings,
    saveWeekDays,
    updateMaxGenerationHistory,
    updateScheduleRanking,
  }
}
