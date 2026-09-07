import type { IActivity } from '~/interfaces/event'
import type { IBasePlannedSubject } from '~/interfaces/subject'
import type { IBaseIntersectionOccurrence } from '~/interfaces/ocurrences'
import type { ILocalGeneratedSchedule } from '~/interfaces/schedule'
import type { ScheduleOptions } from '~/utils/core'
import type { ScheduleFilterDiagnostics } from '~/utils/schedule-ranking'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'

export type ScheduleWorkerInput = [
  subjects: IBasePlannedSubject[],
  activities: IActivity[],
  options: ScheduleOptions,
  rankingPreferences?: IScheduleRankingPreferences,
]

export interface ScheduleGenerationResult {
  occurrences: IBaseIntersectionOccurrence[]
  combinations: ILocalGeneratedSchedule[]
  ranking?: {
    generatedBeforeFilters: number
    filteredOut: number
    diagnostics: ScheduleFilterDiagnostics
  }
}

export type ScheduleWorkerResponse =
  { result: ScheduleGenerationResult } | { error: string }
