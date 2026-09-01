import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type {
  IPlannedSubject,
  ISubject,
  ISubjectSchedule,
} from '~/interfaces/subject'
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
      subjects: ref([]),
      findSubjects: vi.fn().mockResolvedValue([subject]),
      findSchedules: vi.fn().mockResolvedValue([schedule]),
      saveSubject: vi.fn(),
    })

    await importer.prepare([{ courseCode: 'SW603', section: 'U' }])

    expect(importer.readyItems.value).toHaveLength(1)
    expect(importer.readyItems.value[0]?.plannedSubject).toEqual(
      expect.objectContaining({ subject, schedules: [schedule] }),
    )
  })

  it('does not query courses that are already stored', async () => {
    const findSubjects = vi.fn()
    const importer = useEnrollmentSlipImport({
      subjects: ref([
        { subject, schedules: [schedule], color: '#000', id: 'saved' },
      ] as unknown as IPlannedSubject[]),
      findSubjects,
      findSchedules: vi.fn(),
      saveSubject: vi.fn(),
    })

    await importer.prepare([{ courseCode: 'SW603', section: 'U' }])

    expect(importer.items.value[0]?.status).toBe('existing')
    expect(findSubjects).not.toHaveBeenCalled()
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
    const importer = useEnrollmentSlipImport({
      subjects: ref([]),
      findSubjects: vi.fn(async (code) =>
        code === 'SW603' ? [subject] : [secondSubject],
      ),
      findSchedules: vi.fn().mockResolvedValue([schedule]),
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
  })
})
