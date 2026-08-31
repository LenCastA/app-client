import type {
  IPreferences,
  IPreferencesCreate,
  IPreferencesUpdate,
  IScheduleRankingPreferences,
  PreferenceID,
} from '../types/preferences'
import type { Weekdays } from '../types/event'
import { DomainError } from '../errors/domain-error'
import { Audit } from './audit'

export class BasePreferences {
  protected _weekDays: Weekdays[]
  protected _crossings: number
  protected _maxGenerationHistory: number
  protected _scheduleRanking: IScheduleRankingPreferences
  protected _externalId?: PreferenceID
  protected _revision?: number

  protected constructor(input: IPreferencesCreate) {
    BasePreferences.validate(input.maxGenerationHistory, input.scheduleRanking)
    this._weekDays = [...input.weekDays]
    this._crossings = input.crossings
    this._maxGenerationHistory = input.maxGenerationHistory
    this._scheduleRanking = BasePreferences.normalizeScheduleRanking(
      input.scheduleRanking,
    )
    this._externalId = input.externalId
    this._revision = input.revision
  }

  update(input: IPreferencesUpdate): this {
    const maxGenerationHistory =
      input.maxGenerationHistory ?? this._maxGenerationHistory
    const scheduleRanking = input.scheduleRanking
      ? BasePreferences.normalizeScheduleRanking(input.scheduleRanking)
      : this._scheduleRanking
    BasePreferences.validate(maxGenerationHistory, scheduleRanking)
    if (input.weekDays !== undefined) this._weekDays = [...input.weekDays]
    if (input.crossings !== undefined) this._crossings = input.crossings
    this._maxGenerationHistory = maxGenerationHistory
    this._scheduleRanking = scheduleRanking
    if ('externalId' in input) this._externalId = input.externalId
    if ('revision' in input) this._revision = input.revision
    return this
  }

  get weekDays(): Weekdays[] {
    return this._weekDays
  }
  get crossings(): number {
    return this._crossings
  }
  get maxGenerationHistory(): number {
    return this._maxGenerationHistory
  }
  get scheduleRanking(): IScheduleRankingPreferences {
    return structuredClone(this._scheduleRanking)
  }
  get externalId(): PreferenceID | undefined {
    return this._externalId
  }
  get revision(): number | undefined {
    return this._revision
  }

  private static normalizeScheduleRanking(
    value?: IScheduleRankingPreferences,
  ): IScheduleRankingPreferences {
    return {
      ...value,
      freeDays: [...(value?.freeDays ?? [])],
      minimizeGaps: value?.minimizeGaps ?? true,
      minimizeDays: value?.minimizeDays ?? true,
    }
  }

  private static validate(
    maxGenerationHistory: number,
    scheduleRanking?: IScheduleRankingPreferences,
  ): void {
    if (maxGenerationHistory < 1)
      throw new DomainError(
        'invalid-limit',
        'ScheduleGeneration history must be positive.',
        'maxGenerationHistory',
      )
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
    for (const [field, value] of [
      ['earliestStartTime', scheduleRanking?.earliestStartTime],
      ['latestEndTime', scheduleRanking?.latestEndTime],
      ['preferredStartTime', scheduleRanking?.preferredStartTime],
      ['preferredEndTime', scheduleRanking?.preferredEndTime],
    ] as const) {
      if (value && !timePattern.test(value))
        throw new DomainError(
          'invalid-time-range',
          'Schedule ranking times must use HH:mm.',
          `scheduleRanking.${field}`,
        )
    }
    if (
      scheduleRanking?.earliestStartTime &&
      scheduleRanking.latestEndTime &&
      scheduleRanking.earliestStartTime >= scheduleRanking.latestEndTime
    )
      throw new DomainError(
        'invalid-time-range',
        'The earliest start must be before the latest end.',
        'scheduleRanking',
      )

    if (
      scheduleRanking?.preferredStartTime &&
      scheduleRanking.preferredEndTime &&
      scheduleRanking.preferredStartTime >= scheduleRanking.preferredEndTime
    )
      throw new DomainError(
        'invalid-time-range',
        'The preferred start must be before the preferred end.',
        'scheduleRanking',
      )

    const limits = [
      ['maxOccupiedDays', scheduleRanking?.maxOccupiedDays, 1, 7],
      ['maxTotalGapMinutes', scheduleRanking?.maxTotalGapMinutes, 0, 1440],
      ['maxSingleGapMinutes', scheduleRanking?.maxSingleGapMinutes, 0, 1440],
      [
        'maxConsecutiveMinutes',
        scheduleRanking?.maxConsecutiveMinutes,
        1,
        1440,
      ],
    ] as const
    for (const [field, value, minimum, maximum] of limits) {
      if (
        value !== undefined &&
        (!Number.isInteger(value) || value < minimum || value > maximum)
      )
        throw new DomainError(
          'invalid-limit',
          'Schedule ranking limits are outside their valid range.',
          `scheduleRanking.${field}`,
        )
    }

    if (
      scheduleRanking &&
      scheduleRanking.rankingPriority !== undefined &&
      !['FEWER_DAYS', 'FEWER_GAPS'].includes(scheduleRanking.rankingPriority)
    )
      throw new DomainError(
        'invalid-limit',
        'Unknown schedule ranking priority.',
        'scheduleRanking.rankingPriority',
      )

    if (
      scheduleRanking &&
      (new Set(scheduleRanking.freeDays).size !==
        scheduleRanking.freeDays.length ||
        scheduleRanking.freeDays.some(
          (day) => !Number.isInteger(day) || day < 0 || day > 6,
        ))
    )
      throw new DomainError(
        'invalid-limit',
        'Free days must be unique weekdays.',
        'scheduleRanking.freeDays',
      )
  }
}

export class Preferences extends BasePreferences {
  private readonly _id: PreferenceID
  private readonly _audit: Audit

  private constructor(input: IPreferences) {
    super(input)
    this._id = input.id
    this._audit = Audit.reconstitute(input)
  }

  static create(input: IPreferencesCreate): BasePreferences {
    return new BasePreferences(input)
  }
  static reconstitute(input: IPreferences): Preferences {
    return new Preferences(input)
  }

  get id(): PreferenceID {
    return this._id
  }
  get audit(): Audit {
    return this._audit
  }
}
