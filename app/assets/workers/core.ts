import { getSchedules } from '~/utils/core'
import { rankSchedules } from '~/utils/schedule-ranking'
import type {
  ScheduleWorkerInput,
  ScheduleWorkerResponse,
} from '~/interfaces/schedule-worker'

self.addEventListener('message', (event: MessageEvent<string>) => {
  let response: ScheduleWorkerResponse
  try {
    const [subjects, activities, options, preferences]: ScheduleWorkerInput =
      JSON.parse(event.data)
    const output = getSchedules(subjects, activities, options)
    if (preferences) {
      const ranking = rankSchedules(output.combinations, preferences)
      response = {
        result: {
          occurrences: output.occurrences,
          combinations: ranking.ranked.map(({ schedule }) => schedule),
          ranking: {
            generatedBeforeFilters: output.combinations.length,
            filteredOut: ranking.filteredOut,
            diagnostics: ranking.diagnostics,
          },
        },
      }
    } else response = { result: output }
  } catch (error) {
    response = {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron generar los horarios.',
    }
  }
  self.postMessage(response)
})
