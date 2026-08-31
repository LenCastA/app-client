import type { IActivity } from '~/interfaces/event'
import type { IPlannedSubject } from '~/interfaces/subject'
import type { ScheduleOptions } from '~/utils/core'
import { getSchedules } from '~/utils/core'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'
import { rankSchedules } from '~/utils/schedule-ranking'

self.addEventListener(
  'message',
  function (e) {
    const input: [
      subjects: Array<IPlannedSubject>,
      myEvents: Array<IActivity>,
      options?: ScheduleOptions,
      rankingPreferences?: IScheduleRankingPreferences,
    ] = JSON.parse(e.data)
    const [subjects, activities, options, rankingPreferences] = input
    const output = getSchedules(subjects, activities, options)

    if (rankingPreferences) {
      const ranking = rankSchedules(output.combinations, rankingPreferences)
      self.postMessage({
        ...output,
        combinations: ranking.ranked.map(({ schedule }) => schedule),
        ranking: {
          generatedBeforeFilters: output.combinations.length,
          filteredOut: ranking.filteredOut,
          diagnostics: ranking.diagnostics,
        },
      })
      return
    }

    self.postMessage(output)
  },
  false,
)
