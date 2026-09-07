import type { UUID } from 'node:crypto'
import type { Weekdays } from './event'
import type { IIntersectionOccurrence } from './ocurrences'
import type { IGeneratedSchedule } from './schedule'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'

export interface IScheduleGenerationParameters {
  crossingsSetting: number
  weekDays: Weekdays[]
  hourlyLoadId: number
  scheduleRanking?: IScheduleRankingPreferences
}

export interface IScheduleGeneration {
  generatedAt: string
  scheduleIds: UUID[]
  crossingsSetting: number
  weekDays: Weekdays[]
  hourlyLoadId: number
  scheduleRanking?: IScheduleRankingPreferences
  resultCount: number
  occurrences: IIntersectionOccurrence[]
}

export interface IScheduleGenerationResult extends IScheduleGeneration {
  id: UUID
  schedules: IGeneratedSchedule[]
}
