import { describe, expect, it } from 'vitest'
import type { ILocalGeneratedSchedule } from '~/interfaces/schedule'
import type { Weekdays } from '~/interfaces/event'
import type { IScheduleRankingPreferences } from '#shared/domain/types/preferences'
import {
  formatRankingExplanation,
  getScheduleRankingMetrics,
  rankSchedules,
} from '../schedule-ranking'

const preferences: IScheduleRankingPreferences = {
  freeDays: [],
  minimizeGaps: true,
  minimizeDays: true,
}

const makeSchedule = (
  key: string,
  sessions: Array<{ day: Weekdays; startTime: string; endTime: string }>,
): ILocalGeneratedSchedule => ({
  scheduleSubjectKey: key,
  crossings: 0,
  events: [],
  schedulesSubject: [
    {
      id: 1,
      section: { id: 'A' },
      scheduleSubject: { id: Number(key) },
      subject: {
        id: 1,
        course: { id: 'COURSE', name: 'Course' },
        type: { id: 1, name: 'Required', code: 'REQ' },
        studyPlan: {
          id: 1,
          fromDate: '2026-01-01',
          code: 'PLAN',
          organizationUnit: { id: 1 },
        },
        credits: 3,
        cycle: 1,
      },
      sessions: sessions.map((session, index) => ({
        id: index + 1,
        schedule: { id: 1 },
        classroom: { id: 1, code: 'A1' },
        type: { id: 1, code: 'T' },
        ...session,
      })),
    },
  ],
})

describe('schedule ranking', () => {
  it('calculates occupied days, merged gaps, and daily time bounds', () => {
    const metrics = getScheduleRankingMetrics(
      makeSchedule('1', [
        { day: 1, startTime: '08:00', endTime: '10:00' },
        { day: 1, startTime: '11:30', endTime: '13:00' },
        { day: 3, startTime: '09:00', endTime: '12:00' },
      ]),
      preferences,
    )

    expect(metrics).toMatchObject({
      occupiedDays: 2,
      gapMinutes: 90,
      earliestStartTime: '08:00',
      latestEndTime: '13:00',
      maxSingleGapMinutes: 90,
      maxConsecutiveMinutes: 180,
      singleClassDays: 1,
    })
  })

  it('parses API HH:mm:ss and ISO times without shifting the hour', () => {
    const metrics = getScheduleRankingMetrics(
      makeSchedule('1', [
        { day: 1, startTime: '08:00:00', endTime: '10:00:00' },
        {
          day: 1,
          startTime: '2026-08-27T11:30:00',
          endTime: '2026-08-27T13:00:00',
        },
      ]),
      preferences,
    )
    expect(metrics).toMatchObject({
      earliestStartTime: '08:00',
      latestEndTime: '13:00',
      gapMinutes: 90,
    })
  })

  it('applies every hard workload and gap limit', () => {
    const schedule = makeSchedule('1', [
      { day: 1, startTime: '08:00', endTime: '11:00' },
      { day: 1, startTime: '13:00', endTime: '14:00' },
      { day: 2, startTime: '08:00', endTime: '10:00' },
    ])
    const result = rankSchedules([schedule], {
      ...preferences,
      maxOccupiedDays: 1,
      maxTotalGapMinutes: 60,
      maxSingleGapMinutes: 60,
      maxConsecutiveMinutes: 120,
    })
    expect(result.ranked).toHaveLength(0)
    expect(result.diagnostics).toMatchObject({
      tooManyDaysCount: 1,
      tooMuchTotalGapCount: 1,
      tooLargeSingleGapCount: 1,
      tooManyConsecutiveCount: 1,
      minimumPossibleDays: 2,
      minimumPossibleTotalGapMinutes: 120,
      minimumPossibleMaxSingleGapMinutes: 120,
      minimumPossibleMaxConsecutiveMinutes: 180,
    })
  })

  it('uses the selected ranking priority instead of an opaque weight', () => {
    const fewerDays = makeSchedule('1', [
      { day: 1, startTime: '08:00', endTime: '09:00' },
      { day: 1, startTime: '12:00', endTime: '13:00' },
    ])
    const fewerGaps = makeSchedule('2', [
      { day: 1, startTime: '08:00', endTime: '09:00' },
      { day: 2, startTime: '08:00', endTime: '09:00' },
    ])
    expect(
      rankSchedules([fewerGaps, fewerDays], preferences).ranked[0]?.schedule
        .scheduleSubjectKey,
    ).toBe('1')
    expect(
      rankSchedules([fewerDays, fewerGaps], {
        ...preferences,
        rankingPriority: 'FEWER_GAPS',
      }).ranked[0]?.schedule.scheduleSubjectKey,
    ).toBe('2')
  })

  it('uses preferred times and single-block days only as soft ordering', () => {
    const undesired = makeSchedule('1', [
      { day: 1, startTime: '07:00', endTime: '08:00' },
      { day: 2, startTime: '07:00', endTime: '08:00' },
    ])
    const preferred = makeSchedule('2', [
      { day: 1, startTime: '09:00', endTime: '10:00' },
      { day: 1, startTime: '10:00', endTime: '11:00' },
    ])
    const result = rankSchedules([undesired, preferred], {
      ...preferences,
      minimizeDays: false,
      minimizeGaps: false,
      preferredStartTime: '09:00',
      preferredEndTime: '17:00',
      avoidSingleClassDays: true,
    })
    expect(result.ranked).toHaveLength(2)
    expect(result.ranked[0]?.schedule.scheduleSubjectKey).toBe('2')
  })

  it('orders by fewer occupied days and gaps with a stable tie break', () => {
    const spread = makeSchedule('1', [
      { day: 1, startTime: '08:00', endTime: '10:00' },
      { day: 3, startTime: '08:00', endTime: '10:00' },
    ])
    const compact = makeSchedule('2', [
      { day: 1, startTime: '08:00', endTime: '10:00' },
      { day: 1, startTime: '10:00', endTime: '12:00' },
    ])

    expect(
      rankSchedules([spread, compact], preferences).ranked.map(
        ({ schedule }) => schedule.scheduleSubjectKey,
      ),
    ).toEqual(['2', '1'])
  })

  it('filters free days, early starts, and late endings', () => {
    const mondayEarly = makeSchedule('1', [
      { day: 1, startTime: '07:00', endTime: '09:00' },
    ])
    const fridayLate = makeSchedule('2', [
      { day: 5, startTime: '17:00', endTime: '20:00' },
    ])
    const valid = makeSchedule('3', [
      { day: 2, startTime: '09:00', endTime: '17:00' },
    ])

    const result = rankSchedules([mondayEarly, fridayLate, valid], {
      ...preferences,
      freeDays: [5],
      earliestStartTime: '08:00',
      latestEndTime: '18:00',
    })

    expect(result.filteredOut).toBe(2)
    expect(
      result.ranked.map(({ schedule }) => schedule.scheduleSubjectKey),
    ).toEqual(['3'])
    expect(result.diagnostics).toMatchObject({
      evaluatedCount: 3,
      freeDays: [{ day: 5, rejectedCount: 1 }],
      tooEarlyCount: 1,
      tooLateCount: 1,
      latestPossibleStartTime: '17:00',
      earliestPossibleEndTime: '09:00',
    })
  })

  it('reports the latest feasible start when a minimum start is impossible', () => {
    const schedules = [
      makeSchedule('1', [{ day: 1, startTime: '08:00', endTime: '10:00' }]),
      makeSchedule('2', [{ day: 2, startTime: '08:00', endTime: '12:00' }]),
    ]

    const result = rankSchedules(schedules, {
      ...preferences,
      earliestStartTime: '10:00',
    })

    expect(result.ranked).toHaveLength(0)
    expect(result.diagnostics.tooEarlyCount).toBe(2)
    expect(result.diagnostics.latestPossibleStartTime).toBe('08:00')
  })

  it('reports when every schedule occupies a requested free day', () => {
    const schedules = [
      makeSchedule('1', [{ day: 3, startTime: '08:00', endTime: '10:00' }]),
      makeSchedule('2', [{ day: 3, startTime: '10:00', endTime: '12:00' }]),
    ]

    const result = rankSchedules(schedules, {
      ...preferences,
      freeDays: [3],
    })

    expect(result.ranked).toHaveLength(0)
    expect(result.diagnostics.freeDays).toEqual([{ day: 3, rejectedCount: 2 }])
  })

  it('keeps per-filter counts when only the combination is impossible', () => {
    const schedules = [
      makeSchedule('1', [{ day: 1, startTime: '08:00', endTime: '10:00' }]),
      makeSchedule('2', [{ day: 2, startTime: '10:00', endTime: '12:00' }]),
    ]

    const result = rankSchedules(schedules, {
      ...preferences,
      freeDays: [2],
      earliestStartTime: '09:00',
    })

    expect(result.ranked).toHaveLength(0)
    expect(result.diagnostics.freeDays[0]?.rejectedCount).toBe(1)
    expect(result.diagnostics.tooEarlyCount).toBe(1)
  })

  it('returns an explanation that exposes the ranking metrics', () => {
    expect(
      formatRankingExplanation({
        occupiedDays: 2,
        gapMinutes: 90,
        maxSingleGapMinutes: 90,
        maxConsecutiveMinutes: 180,
        singleClassDays: 0,
        preferredTimePenaltyMinutes: 0,
        earliestStartTime: '08:00',
        latestEndTime: '18:00',
      }),
    ).toBe('2 días con clases · 1 h 30 min de huecos · 08:00–18:00')
  })
})
