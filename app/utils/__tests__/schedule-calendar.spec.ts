import { describe, expect, it } from 'vitest'
import {
  calendarTimeRange,
  scheduleCalendarEvents,
  shortTeacherName,
} from '../schedule-calendar'
import type { ILocalGeneratedSchedule } from '~/interfaces/schedule'
import type { IEvent } from '~/interfaces/event'

const event: IEvent = {
  id: '11',
  day: 1,
  startTime: '08:00',
  endTime: '10:00',
  title: 'BMA02 U - Cálculo integral',
  type: 'T',
  color: '#123456',
  category: 'COURSE',
}
const schedule: ILocalGeneratedSchedule = {
  scheduleSubjectKey: '1',
  crossings: 0,
  events: [event],
  schedulesSubject: [
    {
      id: 1,
      section: { id: 'U' },
      scheduleSubject: { id: 1 },
      subject: {
        id: 1,
        course: { id: 'BMA02', name: 'Cálculo integral' },
        credits: 5,
        cycle: 2,
        type: { id: 1, code: 'O', name: 'Obligatorio' },
        studyPlan: {
          id: 1,
          code: '2026',
          fromDate: '2026-01-01',
          organizationUnit: { id: 1 },
        },
      },
      sessions: [
        {
          id: 11,
          schedule: { id: 1 },
          day: 1,
          startTime: '08:00',
          endTime: '10:00',
          type: { id: 1, code: 'T' },
          classroom: { id: 1, code: 'A1' },
          teacher: { id: 1, fullName: 'ARAMBULO OSTOS, CARLOS EDUARDO' },
        },
      ],
    },
  ],
}

describe('schedule calendar presentation', () => {
  it.each([
    ['ARAMBULO OSTOS, CARLOS EDUARDO', 'Carlos Arambulo'],
    ['  BRONCANO TORRES,  JUAN CARLOS ', 'Juan Broncano'],
    ['DE LA CRUZ PEREZ, MARÍA ELENA', 'María De La Cruz'],
    ['Por asignar', 'Por asignar'],
    [undefined, 'Docente por asignar'],
  ])('shortens official teacher name %s', (name, expected) =>
    expect(shortTeacherName(name)).toBe(expected),
  )

  it('adds teacher and course labels to existing saved events without changing their data', () => {
    const original = structuredClone(schedule)
    expect(scheduleCalendarEvents(schedule)[0]).toMatchObject({
      code: 'BMA02',
      section: 'U',
      courseName: 'Cálculo integral',
      teacherName: 'Carlos Arambulo',
    })
    expect(schedule).toEqual(original)
  })

  it('does not label a personal activity as a course even if IDs coincide', () => {
    expect(
      scheduleCalendarEvents({
        ...schedule,
        events: [{ ...event, category: 'MY_EVENT' }],
      })[0],
    ).not.toHaveProperty('teacherName')
  })

  it('uses university hours for empty calendars and ordinary classes', () => {
    expect(calendarTimeRange([])).toEqual({ first: 8, last: 22 })
    expect(calendarTimeRange([event])).toEqual({ first: 8, last: 22 })
  })

  it('includes personal activities outside university hours', () => {
    expect(
      calendarTimeRange([
        {
          ...event,
          category: 'MY_EVENT',
          startTime: '06:30',
          endTime: '23:15',
        },
      ]),
    ).toEqual({ first: 6, last: 24 })
  })

  it('normalizes ISO times and includes a class ending at 22:00 without adding an hour', () => {
    const saved = {
      ...schedule,
      events: [
        {
          ...event,
          startTime: '2026-09-06T08:00:00',
          endTime: '2026-09-06T22:00:00',
        },
      ],
    }
    expect(scheduleCalendarEvents(saved)[0]).toMatchObject({
      start: '08:00',
      end: '22:00',
    })
    expect(calendarTimeRange(saved.events)).toEqual({ first: 8, last: 22 })
  })
})
