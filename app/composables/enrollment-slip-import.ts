import { getNextAvailableEventColor } from '~/constants/event'
import { toRaw } from 'vue'
import type {
  IBasePlannedSubject,
  ISubject,
  ISubjectSchedule,
} from '~/interfaces/subject'
import type { EnrollmentSlipEntry } from '~/utils/enrollment-slip'

export type EnrollmentImportStatus =
  'ready' | 'imported' | 'missing-course' | 'missing-section'

export type EnrollmentImportItem = EnrollmentSlipEntry & {
  status: EnrollmentImportStatus
  message: string
  plannedSubject?: IBasePlannedSubject
}

interface EnrollmentSlipImportDependencies {
  findSubjects: (courseCode: string) => Promise<ISubject[]>
  findSchedules: (subject: ISubject) => Promise<ISubjectSchedule[]>
  replaceSubjects: () => Promise<void>
  saveSubject: (subject: IBasePlannedSubject) => Promise<void>
}

export const useEnrollmentSlipImport = ({
  findSubjects,
  findSchedules,
  replaceSubjects,
  saveSubject,
}: EnrollmentSlipImportDependencies) => {
  const dialog = ref(false)
  const loading = ref(false)
  const error = ref(false)
  const errorMessage = ref('')
  const items = ref<EnrollmentImportItem[]>([])
  const replacementStarted = ref(false)
  const readyItems = computed(() =>
    items.value.filter(
      (
        item,
      ): item is EnrollmentImportItem & {
        plannedSubject: IBasePlannedSubject
      } => item.status === 'ready' && Boolean(item.plannedSubject),
    ),
  )
  const hasBlockingItems = computed(() =>
    items.value.some(
      (item) =>
        item.status === 'missing-course' || item.status === 'missing-section',
    ),
  )

  const prepare = async (entries: EnrollmentSlipEntry[]) => {
    dialog.value = true
    loading.value = true
    error.value = false
    items.value = []
    replacementStarted.value = false
    try {
      const usedColors: string[] = []
      const results: EnrollmentImportItem[] = []
      for (const entry of entries) {
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
    if (hasBlockingItems.value) {
      errorMessage.value =
        'No se puede reemplazar la selección porque faltan cursos o secciones.'
      error.value = true
      return false
    }
    loading.value = true
    error.value = false
    try {
      if (!replacementStarted.value) {
        await replaceSubjects()
        replacementStarted.value = true
      }
      for (const item of readyItems.value) {
        const subject = structuredClone(toRaw(item.plannedSubject))
        await saveSubject(subject)
        item.status = 'imported'
        item.message = `${item.message} · Agregado correctamente.`
      }
      close()
      return true
    } catch (cause) {
      console.error('Enrollment slip replacement failed', cause)
      errorMessage.value =
        cause instanceof Error
          ? `La sustitución se interrumpió: ${cause.message}`
          : 'La sustitución se interrumpió. Puedes reintentar y continuaremos con los cursos pendientes.'
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
    hasBlockingItems,
    prepare,
    close,
    confirm,
  }
}
