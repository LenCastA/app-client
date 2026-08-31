import type { Weekdays } from './event'
import type { UUID } from 'crypto'
import type { IScheduleRankingPreferences } from '~~/shared/domain/types/preferences'

export interface IUserPreferences {
  id: UUID
  weekDays: Weekdays[]
  crossings: number
  maxGenerationHistory: number
  scheduleRanking?: IScheduleRankingPreferences
}
