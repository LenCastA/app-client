import type { Ref } from 'vue'
import { getNextAvailableEventColor } from '~/constants/event'
import type {
  IBasePlannedSubject,
  IPlannedSubject,
  ISubject,
  ISubjectSchedule,
} from '~/interfaces/subject'
import type { EnrollmentSlipEntry } from '~/utils/enrollment-slip'

export type EnrollmentImportStatus =
  'ready' | 'imported' | 'existing' | 'missing-course' | 'missing-section'

export type EnrollmentImportItem = EnrollmentSlipEntry & {
  status: EnrollmentImportStatus
  message: string
  plannedSubject?: IBasePlannedSubject
}

interface EnrollmentSlipImportDependencies {
  subjects: Ref<IPlannedSubject[]>
  findSubjects: (courseCode: string) => Promise<ISubject[]>
  findSchedules: (subject: ISubject) => Promise<ISubjectSchedule[]>
  saveSubject: (subject: IBasePlannedSubject) => Promise<void>
}

export const useEnrollmentSlipImport = ({
  subjects,
  findSubjects,
  findSchedules,
  saveSubject,
}: EnrollmentSlipImportDependencies) => {
  const dialog = ref(false)
  const loading = ref(false)
  const error = ref(false)
  const errorMessage = ref('')
  const items = ref<EnrollmentImportItem[]>([])
  const readyItems = computed(() =>
    items.value.filter(
      (
        item,
      ): item is EnrollmentImportItem & {
        plannedSubject: IBasePlannedSubject
      } => item.status === 'ready' && Boolean(item.plannedSubject),
    ),
  )

  const prepare = async (entries: EnrollmentSlipEntry[]) => {
    dialog.value = true
    loading.value = true
    error.value = false
    items.value = []
    try {
      const usedColors = subjects.value.map((subject) => subject.color)
      const results: EnrollmentImportItem[] = []
      for (const entry of entries) {
        const existing = subjects.value.some(
          (item) => item.subject.course.id.toUpperCase() === entry.courseCode,
        )
        if (existing) {
          results.push({
            ...entry,
            status: 'existing',
            message: 'Ya está agregado.',
          })
          continue
        }

        const subject = (await findSubjects(entry.courseCode)).find(
          (item) => item.course.id.toUpperCase() === entry.courseCode,
        )
        if (!subject) {
          results.push({
            ...entry,
            status: 'missing-course',
            message: 'No se encontró en la carga horaria activa.',
          })
          continue
        }

        const schedule = (await findSchedules(subject)).find(
          (item) => item.section.id.toUpperCase() === entry.section,
        )
        if (!schedule) {
          results.push({
            ...entry,
            status: 'missing-section',
            message: 'El curso existe, pero esa sección no está disponible.',
          })
          continue
        }

        const color = getNextAvailableEventColor(usedColors)
        usedColors.push(color)
        results.push({
          ...entry,
          status: 'ready',
          message: subject.course.name,
          plannedSubject: { subject, schedules: [schedule], color },
        })
      }
      items.value = results
    } catch {
      dialog.value = false
      errorMessage.value =
        'No se pudo consultar la carga horaria. Inténtalo nuevamente.'
      error.value = true
    } finally {
      loading.value = false
    }
  }

  const close = () => {
    dialog.value = false
    items.value = []
  }

  const confirm = async () => {
    loading.value = true
    error.value = false
    try {
      for (const item of readyItems.value) {
        await saveSubject(item.plannedSubject)
        item.status = 'imported'
        item.message = `${item.message} · Agregado correctamente.`
      }
      close()
      return true
    } catch {
      errorMessage.value =
        'La importación se interrumpió. Los cursos ya agregados se conservaron; puedes reintentar los pendientes.'
      error.value = true
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    dialog,
    loading,
    error,
    errorMessage,
    items,
    readyItems,
    prepare,
    close,
    confirm,
  }
}
