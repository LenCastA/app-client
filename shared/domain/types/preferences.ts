import type { Weekdays } from './event'
import type { IAuditable } from './entity-metadata'
import type {
  ReplicatedIdentity,
  ReplicationState,
} from './replicated-identity'
import type { BrandUUID } from './ids'

export type PreferenceID = BrandUUID<'PreferenceID'>

export type ScheduleRankingPriority = 'FEWER_DAYS' | 'FEWER_GAPS'

export interface IScheduleRankingPreferences {
  freeDays: Weekdays[]
  earliestStartTime?: string
  latestEndTime?: string
  maxOccupiedDays?: number
  maxTotalGapMinutes?: number
  maxSingleGapMinutes?: number
  maxConsecutiveMinutes?: number
  preferredStartTime?: string
  preferredEndTime?: string
  avoidSingleClassDays?: boolean
  rankingPriority?: ScheduleRankingPriority
  minimizeGaps: boolean
  minimizeDays: boolean
}

export interface IBasePreferences extends ReplicationState<PreferenceID> {
  weekDays: Weekdays[]
  crossings: number
  maxGenerationHistory: number
  /** Optional so preferences persisted before this feature remain restorable. */
  scheduleRanking?: IScheduleRankingPreferences
}

export interface IPreferences
  extends IBasePreferences, IAuditable, ReplicatedIdentity<PreferenceID> {}

export type IPreferencesCreate = IBasePreferences
export type IPreferencesUpdate = Partial<IPreferencesCreate>
