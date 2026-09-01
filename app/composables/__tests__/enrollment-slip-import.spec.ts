import { describe, expect, it, vi } from 'vitest'
import { isProxy } from 'vue'
import type { ISubject, ISubjectSchedule } from '~/interfaces/subject'
import { useEnrollmentSlipImport } from '../enrollment-slip-import'

const subject = {
  id: 1,
  course: { id: 'SW603', name: 'Diseño de software' },
  type: { id: 1, code: 'O', name: 'Obligatorio' },
  studyPlan: {
    id: 1,
    code: '232',
    fromDate: '2023-01-01',
    organizationUnit: { id: 1 },
  },
  credits: 3,
  cycle: 6,
} satisfies ISubject

const schedule = {
  id: 1,
  section: { id: 'U' },
  scheduleSubject: { id: 1 },
  sessions: [],
} satisfies ISubjectSchedule

describe('useEnrollmentSlipImport', () => {
  it('prepares exact course and section matches', async () => {
    const importer = useEnrollmentSlipImport({
      findSubjects: vi.fn().mockResolvedValue([subject]),
      findSchedules: vi.fn().mockResolvedValue([schedule]),
      replaceSubjects: vi.fn(),
      saveSubject: vi.fn(),
    })

    await importer.prepare([{ courseCode: 'SW603', section: 'U' }])

    expect(importer.readyItems.value).toHaveLength(1)
    expect(importer.readyItems.value[0]?.plannedSubject).toEqual(
      expect.objectContaining({ subject, schedules: [schedule] }),
    )
  })

  it('passes cloneable non-reactive data to persistence', async () => {
    const saveSubject = vi.fn(async (input) => {
      expect(isProxy(input)).toBe(false)
      expect(isProxy(input.subject)).toBe(false)
      expect(isProxy(input.schedules)).toBe(false)
      expect(() => structuredClone(input)).not.toThrow()
    })
    const nestedSchedule = {
      ...schedule,
      sessions: [
        {
          id: 1,
          schedule: { id: 1 },
          classroom: { id: 1, code: 'S1-224' },
          teacher: { id: 1, fullName: 'Docente' },
          type: { id: 1, code: 'T', name: 'Teoría' },
          day: 'Tuesday' as const,
          startTime: '16:00:00',
          endTime: '18:00:00',
        },
      ],
    }
    const importer = useEnrollmentSlipImport({
      findSubjects: vi.fn().mockResolvedValue([subject]),
      findSchedules: vi.fn().mockResolvedValue([nestedSchedule]),
      replaceSubjects: vi.fn(),
      saveSubject,
    })
    await importer.prepare([{ courseCode: 'SW603', section: 'U' }])

    expect(isProxy(importer.readyItems.value[0]?.plannedSubject)).toBe(true)
    await expect(importer.confirm()).resolves.toBe(true)
    expect(saveSubject).toHaveBeenCalledOnce()
  })

  it('resolves courses even when the current selection contains them', async () => {
    const findSubjects = vi.fn().mockResolvedValue([subject])
    const importer = useEnrollmentSlipImport({
      findSubjects,
      findSchedules: vi.fn().mockResolvedValue([schedule]),
      replaceSubjects: vi.fn(),
      saveSubject: vi.fn(),
    })

    await importer.prepare([{ courseCode: 'SW603', section: 'U' }])

    expect(importer.items.value[0]?.status).toBe('ready')
    expect(findSubjects).toHaveBeenCalledWith('SW603')
  })

  it('keeps pending courses retryable after a partial save failure', async () => {
    const secondSubject = {
      ...subject,
      id: 2,
      course: { id: 'SW605', name: 'Ingeniería de requerimientos II' },
    }
    const saveSubject = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('storage failed'))
    const replaceSubjects = vi.fn().mockResolvedValue(undefined)
    const importer = useEnrollmentSlipImport({
      findSubjects: vi.fn(async (code) =>
        code === 'SW603' ? [subject] : [secondSubject],
      ),
      findSchedules: vi.fn().mockResolvedValue([schedule]),
      replaceSubjects,
      saveSubject,
    })
    await importer.prepare([
      { courseCode: 'SW603', section: 'U' },
      { courseCode: 'SW605', section: 'U' },
    ])

    await expect(importer.confirm()).resolves.toBe(false)

    expect(importer.items.value.map((item) => item.status)).toEqual([
      'imported',
      'ready',
    ])
    expect(importer.readyItems.value).toHaveLength(1)
    expect(importer.error.value).toBe(true)

    saveSubject.mockResolvedValueOnce(undefined)
    await expect(importer.confirm()).resolves.toBe(true)
    expect(replaceSubjects).toHaveBeenCalledTimes(1)
    expect(saveSubject).toHaveBeenCalledTimes(3)
  })

  it('does not start importing when clearing current courses fails', async () => {
    const replaceSubjects = vi
      .fn()
      .mockRejectedValue(new Error('delete failed'))
    const saveSubject = vi.fn()
    const importer = useEnrollmentSlipImport({
      findSubjects: vi.fn().mockResolvedValue([subject]),
      findSchedules: vi.fn().mockResolvedValue([schedule]),
      replaceSubjects,
      saveSubject,
    })
    await importer.prepare([{ courseCode: 'SW603', section: 'U' }])

    await expect(importer.confirm()).resolves.toBe(false)

    expect(saveSubject).not.toHaveBeenCalled()
    expect(importer.readyItems.value).toHaveLength(1)
  })
})
