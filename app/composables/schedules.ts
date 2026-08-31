import type { IActivity } from '~/interfaces/event'
import type { IBaseIntersectionOccurrence } from '~/interfaces/ocurrences'
import type { ILocalGeneratedSchedule } from '~/interfaces/schedule'
import {
  rankSchedules,
  type ScheduleFilterDiagnostics,
} from '~/utils/schedule-ranking'
import type { IBasePlannedSubject } from '~/interfaces/subject'
import CoreWorker from '@/assets/workers/core?worker'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'

interface ScheduleGenerationResult {
  occurrences: IBaseIntersectionOccurrence[]
  combinations: ILocalGeneratedSchedule[]
  ranking?: {
    generatedBeforeFilters: number
    filteredOut: number
    diagnostics: ScheduleFilterDiagnostics
  }
}

export const useSchedulesGenerator = () => {
  const worker = shallowRef<Worker | null>(null)
  onMounted(() => {
    worker.value = new CoreWorker()
  })

  onUnmounted(() => {
    worker.value?.terminate()
  })

  const loadSchedulesViaWorker = (
    subjects: Array<IBasePlannedSubject>,
    myEvents: Array<IActivity>,
    options: ScheduleOptions,
    rankingPreferences?: IScheduleRankingPreferences,
  ) => {
    return new Promise<ScheduleGenerationResult>((resolve, reject) => {
      if (!worker.value) reject('Not loaded worker')
      worker.value?.addEventListener(
        'message',
        (
          e: MessageEvent<{
            occurrences: IBaseIntersectionOccurrence[]
            combinations: ILocalGeneratedSchedule[]
            ranking?: ScheduleGenerationResult['ranking']
          }>,
        ) => {
          if (!e.data) reject('No data')
          if (!worker.value) reject('Not found worker')
          worker.value?.removeEventListener('message', () => {})
          resolve(e.data)
        },
        false,
      )
      worker.value?.postMessage(
        JSON.stringify([subjects, myEvents, options, rankingPreferences]),
      )
    })
  }

  const loadSchedules = (
    subjects: Array<IBasePlannedSubject>,
    myEvents: Array<IActivity>,
    options: ScheduleOptions,
    rankingPreferences?: IScheduleRankingPreferences,
  ): Promise<ScheduleGenerationResult> => {
    return loadSchedulesViaWorker(
      subjects,
      myEvents,
      options,
      rankingPreferences,
    ).catch((error) => {
      console.error(error)
      const output = getSchedules(subjects, myEvents, options)
      if (!rankingPreferences) return output
      const ranking = rankSchedules(output.combinations, rankingPreferences)
      return {
        ...output,
        combinations: ranking.ranked.map(({ schedule }) => schedule),
        ranking: {
          generatedBeforeFilters: output.combinations.length,
          filteredOut: ranking.filteredOut,
          diagnostics: ranking.diagnostics,
        },
      }
    })
  }

  return { loadSchedules }
}
