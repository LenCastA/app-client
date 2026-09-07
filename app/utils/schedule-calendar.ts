import type { IEvent } from '~/interfaces/event'
import type { GeneratedScheduleInput } from '~/interfaces/schedule'

export function shortTeacherName(fullName?: string): string {
  const name = fullName?.trim().replace(/\s+/g, ' ')
  if (!name) return 'Docente por asignar'
  const [family, given] = name.split(',').map((part) => part.trim())
  // Official loads use "surnames, given names". Keep unstructured names intact.
  if (!given || !family) return name
  const surname = family.match(/^(?:(?:de|del|la|las|los)\s+)*\S+/i)?.[0]
  return `${given.split(' ')[0]} ${surname}`
    .toLocaleLowerCase('es')
    .replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('es'))
}

export function calendarTimeRange(events: IEvent[]) {
  let first = 8
  let last = 22
  for (const event of events) {
    const start = event.startTime.match(/(?:^|T)(\d{2}):(\d{2})/)
    const end = event.endTime.match(/(?:^|T)(\d{2}):(\d{2})/)
    if (start) first = Math.min(first, Number(start[1]))
    if (end)
      last = Math.max(last, Number(end[1]) + (Number(end[2]) > 0 ? 1 : 0))
  }
  return { first, last }
}

export function scheduleCalendarEvents(schedule: GeneratedScheduleInput) {
  const sessions = new Map(
    schedule.schedulesSubject.flatMap((section) =>
      section.sessions.map(
        (session) => [String(session.id), { session, section }] as const,
      ),
    ),
  )
  return schedule.events.map((event) => {
    const source =
      event.category === 'MY_EVENT' ? undefined : sessions.get(event.id)
    return {
      ...event,
      start: event.startTime.split('T').at(-1)!.slice(0, 5),
      end: event.endTime.split('T').at(-1)!.slice(0, 5),
      weekDay: event.day,
      name: event.title,
      ...(source
        ? {
            code: source.section.subject.course.id,
            section: source.section.section.id,
            courseName: source.section.subject.course.name,
            teacherName: shortTeacherName(source.session.teacher?.fullName),
          }
        : {}),
    }
  })
}
