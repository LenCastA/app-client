import type { GeneratedScheduleInput } from '~/interfaces/schedule'
import type { Weekdays } from '~/interfaces/event'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'

export interface ScheduleRankingMetrics {
  occupiedDays: number
  gapMinutes: number
  maxSingleGapMinutes: number
  maxConsecutiveMinutes: number
  singleClassDays: number
  preferredTimePenaltyMinutes: number
  earliestStartTime?: string
  latestEndTime?: string
}
export interface RankedSchedule<T extends GeneratedScheduleInput> {
  schedule: T
  metrics: ScheduleRankingMetrics
}
export interface ScheduleRankingResult<T extends GeneratedScheduleInput> {
  ranked: RankedSchedule<T>[]
  filteredOut: number
  diagnostics: ScheduleFilterDiagnostics
}
export interface ScheduleFilterDiagnostics {
  evaluatedCount: number
  freeDays: Array<{ day: Weekdays; rejectedCount: number }>
  tooEarlyCount: number
  tooLateCount: number
  tooManyDaysCount: number
  tooMuchTotalGapCount: number
  tooLargeSingleGapCount: number
  tooManyConsecutiveCount: number
  latestPossibleStartTime?: string
  earliestPossibleEndTime?: string
  minimumPossibleDays?: number
  minimumPossibleTotalGapMinutes?: number
  minimumPossibleMaxSingleGapMinutes?: number
  minimumPossibleMaxConsecutiveMinutes?: number
}
interface TimeRange {
  start: number
  end: number
}

export const cloneScheduleRanking = (
  value: IScheduleRankingPreferences,
): IScheduleRankingPreferences => ({
  ...value,
  freeDays: [...value.freeDays],
  rankingPriority: value.rankingPriority ?? 'FEWER_DAYS',
  avoidSingleClassDays: value.avoidSingleClassDays ?? false,
})
const toMinutes = (time: string): number => {
  const match = time.match(/(?:^|T)([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?/)
  if (!match) throw new Error(`Invalid schedule time: ${time}`)
  return Number(match[1]) * 60 + Number(match[2])
}
const toTime = (minutes?: number) =>
  minutes === undefined
    ? undefined
    : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const getClassRanges = <T extends GeneratedScheduleInput>(schedule: T) => {
  const result = new Map<Weekdays, TimeRange[]>()
  for (const section of schedule.schedulesSubject)
    for (const session of section.sessions) {
      const ranges = result.get(session.day) ?? []
      ranges.push({
        start: toMinutes(session.startTime),
        end: toMinutes(session.endTime),
      })
      result.set(session.day, ranges)
    }
  return result
}
const mergeRanges = (ranges: TimeRange[]) => {
  const merged: TimeRange[] = []
  for (const range of [...ranges].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  )) {
    const previous = merged.at(-1)
    if (!previous || range.start > previous.end) merged.push({ ...range })
    else previous.end = Math.max(previous.end, range.end)
  }
  return merged
}

export const getScheduleRankingMetrics = <T extends GeneratedScheduleInput>(
  schedule: T,
  preferences: IScheduleRankingPreferences,
): ScheduleRankingMetrics => {
  const rangesByDay = getClassRanges(schedule)
  let gapMinutes = 0
  let maxSingleGapMinutes = 0
  let maxConsecutiveMinutes = 0
  let singleClassDays = 0
  let earliestStart: number | undefined
  let latestEnd: number | undefined
  for (const ranges of rangesByDay.values()) {
    const merged = mergeRanges(ranges)
    if (merged.length === 1) singleClassDays++
    for (let index = 1; index < merged.length; index++) {
      const gap = merged[index]!.start - merged[index - 1]!.end
      gapMinutes += gap
      maxSingleGapMinutes = Math.max(maxSingleGapMinutes, gap)
    }
    for (const range of merged)
      maxConsecutiveMinutes = Math.max(
        maxConsecutiveMinutes,
        range.end - range.start,
      )
    const first = merged[0]
    const last = merged.at(-1)
    if (first)
      earliestStart = Math.min(earliestStart ?? first.start, first.start)
    if (last) latestEnd = Math.max(latestEnd ?? last.end, last.end)
  }
  const preferredStart = preferences.preferredStartTime
    ? toMinutes(preferences.preferredStartTime)
    : undefined
  const preferredEnd = preferences.preferredEndTime
    ? toMinutes(preferences.preferredEndTime)
    : undefined
  return {
    occupiedDays: rangesByDay.size,
    gapMinutes,
    maxSingleGapMinutes,
    maxConsecutiveMinutes,
    singleClassDays,
    preferredTimePenaltyMinutes:
      (preferredStart !== undefined && earliestStart !== undefined
        ? Math.max(0, preferredStart - earliestStart)
        : 0) +
      (preferredEnd !== undefined && latestEnd !== undefined
        ? Math.max(0, latestEnd - preferredEnd)
        : 0),
    earliestStartTime: toTime(earliestStart),
    latestEndTime: toTime(latestEnd),
  }
}

const rejectionsFor = (
  occupiedDays: Set<Weekdays>,
  preferences: IScheduleRankingPreferences,
  metrics: ScheduleRankingMetrics,
) => ({
  occupiedFreeDays: preferences.freeDays.filter((day) => occupiedDays.has(day)),
  startsTooEarly:
    !!preferences.earliestStartTime &&
    !!metrics.earliestStartTime &&
    metrics.earliestStartTime < preferences.earliestStartTime,
  endsTooLate:
    !!preferences.latestEndTime &&
    !!metrics.latestEndTime &&
    metrics.latestEndTime > preferences.latestEndTime,
  tooManyDays:
    preferences.maxOccupiedDays !== undefined &&
    metrics.occupiedDays > preferences.maxOccupiedDays,
  tooMuchTotalGap:
    preferences.maxTotalGapMinutes !== undefined &&
    metrics.gapMinutes > preferences.maxTotalGapMinutes,
  tooLargeSingleGap:
    preferences.maxSingleGapMinutes !== undefined &&
    metrics.maxSingleGapMinutes > preferences.maxSingleGapMinutes,
  tooManyConsecutive:
    preferences.maxConsecutiveMinutes !== undefined &&
    metrics.maxConsecutiveMinutes > preferences.maxConsecutiveMinutes,
})
const compareMetrics = (
  a: ScheduleRankingMetrics,
  b: ScheduleRankingMetrics,
  preferences: IScheduleRankingPreferences,
) => {
  const criteria: Array<(metrics: ScheduleRankingMetrics) => number> = []
  if (preferences.rankingPriority === 'FEWER_GAPS') {
    if (preferences.minimizeGaps) criteria.push((metrics) => metrics.gapMinutes)
    if (preferences.minimizeDays)
      criteria.push((metrics) => metrics.occupiedDays)
  } else {
    if (preferences.minimizeDays)
      criteria.push((metrics) => metrics.occupiedDays)
    if (preferences.minimizeGaps) criteria.push((metrics) => metrics.gapMinutes)
  }
  if (preferences.preferredStartTime || preferences.preferredEndTime)
    criteria.push((metrics) => metrics.preferredTimePenaltyMinutes)
  if (preferences.avoidSingleClassDays)
    criteria.push((metrics) => metrics.singleClassDays)
  for (const criterion of criteria) {
    const difference = criterion(a) - criterion(b)
    if (difference) return difference
  }
  return 0
}

export const rankSchedules = <T extends GeneratedScheduleInput>(
  schedules: T[],
  preferences: IScheduleRankingPreferences,
): ScheduleRankingResult<T> => {
  const evaluated = schedules.map((schedule, originalIndex) => {
    const metrics = getScheduleRankingMetrics(schedule, preferences)
    return {
      schedule,
      metrics,
      originalIndex,
      rejections: rejectionsFor(
        new Set(getClassRanges(schedule).keys()),
        preferences,
        metrics,
      ),
    }
  })
  const ranked = evaluated
    .filter(
      ({ rejections }) =>
        rejections.occupiedFreeDays.length === 0 &&
        !rejections.startsTooEarly &&
        !rejections.endsTooLate &&
        !rejections.tooManyDays &&
        !rejections.tooMuchTotalGap &&
        !rejections.tooLargeSingleGap &&
        !rejections.tooManyConsecutive,
    )
    .sort(
      (a, b) =>
        compareMetrics(a.metrics, b.metrics, preferences) ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ schedule, metrics }) => ({ schedule, metrics }))
  const metrics = evaluated.map((entry) => entry.metrics)
  const count = (
    key: Exclude<
      keyof (typeof evaluated)[number]['rejections'],
      'occupiedFreeDays'
    >,
  ) => evaluated.filter((entry) => entry.rejections[key]).length
  const minimum = (selector: (value: ScheduleRankingMetrics) => number) =>
    metrics.length ? Math.min(...metrics.map(selector)) : undefined
  const startTimes = metrics.flatMap((value) =>
    value.earliestStartTime ? [value.earliestStartTime] : [],
  )
  const endTimes = metrics.flatMap((value) =>
    value.latestEndTime ? [value.latestEndTime] : [],
  )
  return {
    ranked,
    filteredOut: schedules.length - ranked.length,
    diagnostics: {
      evaluatedCount: evaluated.length,
      freeDays: preferences.freeDays.map((day) => ({
        day,
        rejectedCount: evaluated.filter((entry) =>
          entry.rejections.occupiedFreeDays.includes(day),
        ).length,
      })),
      tooEarlyCount: count('startsTooEarly'),
      tooLateCount: count('endsTooLate'),
      tooManyDaysCount: count('tooManyDays'),
      tooMuchTotalGapCount: count('tooMuchTotalGap'),
      tooLargeSingleGapCount: count('tooLargeSingleGap'),
      tooManyConsecutiveCount: count('tooManyConsecutive'),
      latestPossibleStartTime: [...startTimes].sort().at(-1),
      earliestPossibleEndTime: [...endTimes].sort().at(0),
      minimumPossibleDays: minimum((value) => value.occupiedDays),
      minimumPossibleTotalGapMinutes: minimum((value) => value.gapMinutes),
      minimumPossibleMaxSingleGapMinutes: minimum(
        (value) => value.maxSingleGapMinutes,
      ),
      minimumPossibleMaxConsecutiveMinutes: minimum(
        (value) => value.maxConsecutiveMinutes,
      ),
    },
  }
}
const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return (
    `${hours ? `${hours} h` : ''}${hours && remainder ? ' ' : ''}${remainder ? `${remainder} min` : ''}` ||
    '0 min'
  )
}
export const formatRankingExplanation = (metrics: ScheduleRankingMetrics) =>
  `${metrics.occupiedDays} días con clases · ${metrics.gapMinutes ? `${formatMinutes(metrics.gapMinutes)} de huecos` : 'sin huecos'} · ${metrics.earliestStartTime ?? '--:--'}–${metrics.latestEndTime ?? '--:--'}${metrics.singleClassDays ? ` · ${metrics.singleClassDays} días con un solo bloque` : ''}`
