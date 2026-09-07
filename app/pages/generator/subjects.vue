<template>
  <v-data-table
    v-model="selectedSubjectIds"
    :headers="SUBJECT_HEADERS"
    :items="mySubjects"
    class="elevation-1 subjects-table"
    density="comfortable"
    mobile-breakpoint="md"
    :mobile="null"
    item-value="id"
    show-select
  >
    <template #top>
      <div class="subjects-heading">
        <h2>Cursos disponibles</h2>
        <SubjectEnrollmentSlipUploader @parsed="prepareEnrollmentImport" />
      </div>
      <v-sheet flat class="subject-search">
        <SubjectSearchContext
          :speciality-name="activeSpecialityName"
          :study-plan-name="activeStudyPlanName"
          :report-url="studyPlanReportUrl"
        />
        <SubjectSelect
          v-model="selectedSubject"
          v-model:search="search"
          v-model:menu="openSearchMenu"
          :status-subjects="statusSubjects"
          :subjects="availableCourses"
          @update:model-value="addNewSubject"
        />
        <v-dialog
          v-model="dialog"
          scrollable
          density="comfortable"
          max-width="800"
          @click:outside="close"
          @keydown.esc="close"
        >
          <SubjectSchedulesEdit
            v-if="subjectSchedules"
            :subject-schedules="subjectSchedules"
            :available-schedules="schedules"
            :loading="statusSchedules === 'pending'"
            :report-url="scheduleReportUrl"
            @save="save"
            @cancel="close"
          />
        </v-dialog>
      </v-sheet>

      <div class="subjects-heading subjects-heading--selected">
        <div class="subjects-heading__title">
          <h2>Cursos seleccionados</h2>
          <v-chip size="small" color="primary">{{ mySubjects.length }}</v-chip>
        </div>
        <v-btn to="/generator" color="primary" variant="flat">
          Generar horarios
        </v-btn>
      </div>
      <div v-if="mySubjects.length" class="course-selection-bar">
        <v-checkbox
          :model-value="allSubjectsSelected"
          :indeterminate="selectedSubjectIds.length > 0 && !allSubjectsSelected"
          :disabled="deletingSubjects"
          label="Seleccionar todos los cursos"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="selectAllSubjects"
        />
        <span
          class="selection-count text-body-2 text-medium-emphasis"
          aria-live="polite"
          >{{ selectedSubjectIds.length }} de
          {{ mySubjects.length }} seleccionados para eliminar</span
        >
        <v-btn
          v-if="selectedSubjectIds.length"
          class="selection-delete"
          color="error"
          variant="tonal"
          density="comfortable"
          :prepend-icon="mdiDeleteOutline"
          :loading="deletingSubjects"
          @click="openBulkDelete"
        >
          Eliminar ({{ selectedSubjectIds.length }})
        </v-btn>
      </div>
    </template>
    <template #[`header.data-table-select`]>
      <span class="d-sr-only">Seleccionar cursos para eliminar</span>
    </template>
    <template #[`item.data-table-select`]="{ item, props: selectionProps }">
      <v-checkbox-btn
        v-bind="selectionProps"
        :aria-label="`Seleccionar ${item.subject.course.id} para eliminar`"
        :label="$vuetify.display.smAndDown ? 'Seleccionar curso' : undefined"
        density="compact"
        color="primary"
      />
    </template>
    <template #[`item.subject.studyPlan.name`]="{ item }">
      <span class="text-body-2 text-medium-emphasis">{{
        item.subject.studyPlan.name || item.subject.studyPlan.code
      }}</span>
    </template>
    <template #no-data>
      <SubjectTableNoData />
    </template>
    <template #[`item.color`]="{ item }">
      <BaseColorEditor
        :color="item.color"
        :loading="updatingColor"
        title="Color del curso"
        @save="saveColor(item, $event)"
      />
    </template>
    <template #[`item.sections`]="{ item }">
      <SubjectTableItemSectionList :schedules="item.schedules" />
    </template>
    <template #[`item.actions`]="{ item }">
      <SubjectTableItemActions
        @click:edit="editItem(item)"
        @click:delete="deleteItem(item)"
      />
    </template>
    <template #bottom>
      <v-divider />
      <SubjectTotalCredits :subjects="mySubjects">
        <template v-if="missingCourseReportUrl" #actions>
          <v-btn
            :href="missingCourseReportUrl"
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            density="compact"
            size="small"
            :prepend-icon="mdiBookSearchOutline"
            :append-icon="mdiOpenInNew"
          >
            ¿No encuentras tu curso?
          </v-btn>
        </template>
      </SubjectTotalCredits>

      <base-confirm-dialog
        v-if="selectedDelete"
        v-model="dialogDelete"
        title="Eliminar curso"
        confirm-text="Eliminar"
        reject-text="Cancelar"
        :loading="deletingSubjects"
        @click:confirm="deleteItemConfirm(selectedDelete)"
        @click:reject="closeDelete"
      >
        ¿Estás seguro de eliminar el curso de
        {{ selectedDelete.subject?.course?.name }}?
      </base-confirm-dialog>
      <v-dialog v-model="enrollmentImportDialog" max-width="760">
        <v-card title="Revisar cursos de la boleta">
          <v-card-text>
            <div
              v-if="importingEnrollment && enrollmentImports.length === 0"
              class="d-flex flex-column align-center ga-3 py-8"
            >
              <v-progress-circular indeterminate color="primary" />
              <span>Buscando cursos y secciones en la carga activa…</span>
            </div>
            <v-alert
              v-else-if="hasBlockingEnrollmentImports"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              No se reemplazará nada mientras haya cursos o secciones que no
              existan en la carga activa.
            </v-alert>
            <v-alert
              v-else-if="readyEnrollmentImports.length"
              type="warning"
              variant="tonal"
              class="mb-4"
            >
              Se eliminarán los {{ mySubjects.length }} cursos actuales y se
              reemplazarán por {{ readyEnrollmentImports.length }} cursos de la
              boleta.
            </v-alert>
            <v-list lines="two">
              <v-list-item
                v-for="item in enrollmentImports"
                :key="`${item.courseCode}-${item.section}`"
                :title="`${item.courseCode} · Sección ${item.section}`"
                :subtitle="item.message"
              >
                <template #prepend>
                  <v-icon
                    :color="
                      item.status === 'ready' || item.status === 'imported'
                        ? 'success'
                        : 'warning'
                    "
                  >
                    {{
                      item.status === 'ready' || item.status === 'imported'
                        ? mdiCheckCircleOutline
                        : mdiAlertOutline
                    }}
                  </v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              :disabled="importingEnrollment"
              @click="closeEnrollmentImport"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              :loading="importingEnrollment"
              :disabled="
                readyEnrollmentImports.length === 0 ||
                hasBlockingEnrollmentImports
              "
              @click="completeEnrollmentImport"
            >
              Reemplazar por {{ readyEnrollmentImports.length }} cursos
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <base-confirm-dialog
        v-model="dialogBulkDelete"
        title="Eliminar cursos seleccionados"
        confirm-text="Eliminar"
        reject-text="Cancelar"
        :loading="deletingSubjects"
        @click:confirm="deleteSelectedSubjects"
        @click:reject="closeBulkDelete"
      >
        ¿Estás seguro de eliminar los {{ selectedSubjectIds.length }} cursos
        seleccionados? Esta acción también quitará sus secciones del generador.
      </base-confirm-dialog>
      <base-snackbar v-model="succcesAddCourse">
        Curso Agregado correctamente!
      </base-snackbar>
      <base-snackbar v-model="succcesUpdateCourse">
        Curso Actualizado correctamente!
      </base-snackbar>
      <base-snackbar v-model="succcesDeleteCourse">
        {{ deleteSuccessMessage }}
      </base-snackbar>
      <base-snackbar
        v-model="deleteCourseError"
        variant="error"
        :timeout="6000"
      >
        No se pudieron eliminar todos los cursos seleccionados. Conservamos la
        selección pendiente para que puedas volver a intentarlo.
      </base-snackbar>
      <base-snackbar
        v-model="enrollmentImportError"
        variant="error"
        :timeout="6000"
      >
        {{ enrollmentImportErrorMessage }}
      </base-snackbar>
      <base-confirm-dialog
        v-if="pendingUnrecommendedSubject"
        v-model="confirmUnrecommended"
        @click:confirm="confirmAddUnrecommended"
        @click:reject="cancelAddUnrecommended"
      >
        {{ pendingUnrecommendedSubject.course.name }} no figura en la malla
        conocida de tu carrera. La información puede estar desactualizada.
        ¿Deseas agregarlo de todas formas?
      </base-confirm-dialog>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  mdiAlertOutline,
  mdiBookSearchOutline,
  mdiCheckCircleOutline,
  mdiDeleteOutline,
  mdiOpenInNew,
} from '@mdi/js'
import SubjectEnrollmentSlipUploader from '~/components/subject/EnrollmentSlipUploader.vue'
import SubjectSchedulesEdit from '~/components/subject/SchedulesEdit.vue'
import SubjectTableItemSectionList from '~/components/subject/table/ItemSectionList.vue'
import SubjectTableNoData from '~/components/subject/table/NoData.vue'
import { useUserProfileStore } from '~/stores/user-profile'
import type {
  IPlannedSubject,
  ISubjectSchedule,
  ISubject,
  IBasePlannedSubject,
} from '~/interfaces/subject'
import { SUBJECT_HEADERS } from '~/constants/subjects'
import { getNextAvailableEventColor } from '~/constants/event'
import SubjectTableItemActions from '~/components/subject/table/ItemActions.vue'
import {
  useSubjectApi,
  useScheduleSubjectApi,
  useStudyPlanApi,
} from '~~/modules/apis/runtime/composables'
import SubjectTotalCredits from '~/components/subject/TotalCredits.vue'
import SubjectSelect from '~/components/subject/Select.vue'
import { useUserSubjects } from '~/composables/user-subjects'
import type { PlannedSubject } from '~/models/planned-subject'
import type { PlannedSubjectId } from '~~/shared/domain'
import { toAppScheduleSubject } from '~/mappers/schedule/api'
import SubjectSearchContext from '~/components/subject/SearchContext.vue'
import {
  buildHourlyLoadReportUrl,
  buildStudyPlanReportUrl,
  withHourlyLoadSubjectSchedules,
  withStudyPlanReportProblem,
} from '~/utils/study-plan-report'

useSeoMeta({
  title: 'Cursos - Generador de Horarios',
  description: 'Administra tus cursos para tener un mejor control de tu tiempo',
})

const subjectApi = useSubjectApi()
const studyPlanApi = useStudyPlanApi()

const configStore = useUserProfileStore()
const {
  mySubjects,
  deleteSubjectById,
  deleteSubjectsById,
  updateSubject,
  updateSubjectColor,
  saveNewSubject,
  refreshSubjectCatalog,
} = useUserSubjects()

const selectedSubjectIds = ref<PlannedSubjectId[]>([])
const allSubjectsSelected = computed(
  () =>
    mySubjects.value.length > 0 &&
    selectedSubjectIds.value.length === mySubjects.value.length,
)
const selectAllSubjects = (selected: boolean | null) => {
  if (!deletingSubjects.value)
    selectedSubjectIds.value = selected
      ? mySubjects.value.map((subject) => subject.id)
      : []
}
const dialogBulkDelete = ref(false)

const succcesAddCourse = ref(false)

const selectedSubject = shallowRef<ISubject>()
const availableCourses = computed(() => {
  return subjects.value?.filter(
    (c1) =>
      !mySubjects.value.some(
        (c2) =>
          c1.id === c2.subject.id || c1.course.id === c2.subject.course.id,
      ),
  )
})
const { facultyId, specialityId, studyPlanId, hourlyLoad, speciality } =
  storeToRefs(configStore)
const { fetchSpecialityById } = useUserProfile()

watch(
  specialityId,
  async (newSpecialityId) => {
    if (newSpecialityId && !speciality.value) {
      await fetchSpecialityById(newSpecialityId)
    }
  },
  { immediate: true },
)

const { data: studyPlans } = useAsyncData(
  'profile-study-plans',
  async () => {
    if (!specialityId.value) return []
    return studyPlanApi.getAllBySpecialityId(specialityId.value)
  },
  {
    default: () => [],
    watch: [specialityId, studyPlanId],
    server: false,
  },
)

const activeSpecialityName = computed(() => speciality.value?.name)
const activeStudyPlanName = computed(() => {
  if (!studyPlanId.value) return undefined
  const plan = studyPlans.value.find((item) => item.id === studyPlanId.value)
  if (!plan) return undefined
  if (plan.code && plan.name) return `${plan.code} - ${plan.name}`
  return plan.name ?? plan.code
})
const studyPlanReportUrl = computed(() => {
  if (!studyPlanId.value || !speciality.value?.name) return undefined
  const plan = studyPlans.value.find((item) => item.id === studyPlanId.value)
  if (!plan) return undefined
  return buildStudyPlanReportUrl({
    specialityName: speciality.value.name,
    studyPlanName: plan.name ?? plan.code,
    studyPlanCode: plan.name ? plan.code : undefined,
    fromDate: plan.fromDate,
  })
})
const missingCourseReportUrl = computed(() => {
  if (!studyPlanReportUrl.value) return undefined
  return withStudyPlanReportProblem(studyPlanReportUrl.value, 'missing-subject')
})

const refresh = async () => {
  try {
    await refreshSubjectCatalog()
  } catch {
    // IndexedDB remains the offline source of truth.
  }
}

if (mySubjects.value.length > 0) {
  void refresh()
} else {
  watch(
    () => mySubjects.value.length,
    (length) => {
      if (length > 0) void refresh()
    },
    { once: true },
  )
}

const dialog = ref(false)
const dialogDelete = ref(false)

const subjectSchedules = shallowRef<IBasePlannedSubject | IPlannedSubject>()

const openSearchMenu = ref(false)
const pendingUnrecommendedSubject = shallowRef<ISubject>()
const confirmUnrecommended = ref(false)

const addNewSubject = (item?: ISubject) => {
  if (!item) return
  if (item.recommended === false) {
    pendingUnrecommendedSubject.value = item
    confirmUnrecommended.value = true
    return
  }
  openSubject(item)
}

const openSubject = (item: ISubject) => {
  const color = getNextAvailableEventColor(
    mySubjects.value.map((subject) => subject.color),
  )
  openSearchMenu.value = false
  editItem({
    subject: item,
    schedules: [],
    color,
  })
}

const confirmAddUnrecommended = () => {
  if (pendingUnrecommendedSubject.value)
    openSubject(pendingUnrecommendedSubject.value)
  cancelAddUnrecommended()
}

const cancelAddUnrecommended = () => {
  confirmUnrecommended.value = false
  pendingUnrecommendedSubject.value = undefined
  selectedSubject.value = undefined
}

const scheduleSubjectApi = useScheduleSubjectApi()
const {
  dataset: localDataset,
  ensureLoaded: ensureLocalHourlyLoad,
  searchSubjects,
  schedulesForSubject,
} = useLocalHourlyLoad()
await ensureLocalHourlyLoad()

const findCatalogSubjects = async (searchValue: string) => {
  if (localDataset.value) return searchSubjects(searchValue)
  const hourlyLoadId = hourlyLoad.value?.id
  if (!hourlyLoadId) return []
  if (specialityId.value) {
    return (
      await subjectApi.findPageBySpeciality({
        search: searchValue,
        specialityId: specialityId.value,
        hourlyLoadId,
      })
    ).content
  }
  if (studyPlanId.value) {
    return (
      await subjectApi.findPageByStudyPlan({
        search: searchValue,
        studyPlanId: studyPlanId.value,
        hourlyLoadId,
      })
    ).content
  }
  return (
    await subjectApi.findPageByFaculty({
      search: searchValue,
      facultyId: facultyId.value ?? 31,
      hourlyLoadId,
    })
  ).content
}

const findSubjectSchedules = async (subject: ISubject) => {
  if (localDataset.value) return schedulesForSubject(subject.id)
  const hourlyLoadId = hourlyLoad.value?.id
  if (!hourlyLoadId) return []
  const response = await scheduleSubjectApi.findBySubjectIdAndHourlyLoadId(
    subject.id,
    hourlyLoadId,
  )
  return response.map(toAppScheduleSubject).map((item) => ({
    ...item.schedule,
    scheduleSubject: { id: item.id },
  }))
}

const {
  dialog: enrollmentImportDialog,
  loading: importingEnrollment,
  error: enrollmentImportError,
  errorMessage: enrollmentImportErrorMessage,
  items: enrollmentImports,
  readyItems: readyEnrollmentImports,
  hasBlockingItems: hasBlockingEnrollmentImports,
  prepare: prepareEnrollmentImport,
  close: closeEnrollmentImport,
  confirm: confirmEnrollmentImport,
} = useEnrollmentSlipImport({
  findSubjects: findCatalogSubjects,
  findSchedules: findSubjectSchedules,
  replaceSubjects: () =>
    deleteSubjectsById(mySubjects.value.map((subject) => subject.id)),
  saveSubject: saveNewSubject,
})

const completeEnrollmentImport = async () => {
  if (await confirmEnrollmentImport()) succcesAddCourse.value = true
}

const {
  data: schedules,
  status: statusSchedules,
  execute: fetchSchedules,
} = useAsyncData<ISubjectSchedule[]>(
  'generator-subject-schedules',
  async () => {
    const subject = subjectSchedules.value?.subject
    if (!subject) return []

    if (localDataset.value) return schedulesForSubject(subject.id)

    const _hourlyLoadId = hourlyLoad.value?.id
    if (!_hourlyLoadId) return []

    const schedulesSubject =
      await scheduleSubjectApi.findBySubjectIdAndHourlyLoadId(
        subject.id,
        _hourlyLoadId,
      )

    return schedulesSubject.map(toAppScheduleSubject).map((sb) => ({
      ...sb.schedule,
      scheduleSubject: {
        id: sb.id,
      },
    }))
  },
  {
    default: () => [],
    watch: [hourlyLoad, localDataset],
    immediate: false,
    server: false,
  },
)

const scheduleReportUrl = computed(() => {
  const subject = subjectSchedules.value?.subject
  const currentHourlyLoad = hourlyLoad.value
  const specialityName = speciality.value?.name
  if (!subject || !currentHourlyLoad || !specialityName) return undefined

  const reportUrl = buildHourlyLoadReportUrl({
    specialityName,
    hourlyLoadName: currentHourlyLoad.name,
  })
  return withHourlyLoadSubjectSchedules(reportUrl, {
    courseCode: subject.course.id,
    courseName: subject.course.name,
    sections: schedules.value.map((schedule) => schedule.section.id),
  })
})

const editItem = (item: IPlannedSubject | IBasePlannedSubject) => {
  subjectSchedules.value = item
  fetchSchedules()
  dialog.value = true
}

const selectedDelete = ref<IPlannedSubject>()
const deleteItem = (item: IPlannedSubject) => {
  selectedDelete.value = item
  dialogDelete.value = true
}

const succcesDeleteCourse = ref(false)
const deleteCourseError = ref(false)
const deletingSubjects = ref(false)
const deletedSubjectCount = ref(1)
const deleteSuccessMessage = computed(() =>
  deletedSubjectCount.value === 1
    ? 'Curso eliminado correctamente.'
    : `${deletedSubjectCount.value} cursos eliminados correctamente.`,
)
const deleteItemConfirm = async (item: IPlannedSubject) => {
  deletingSubjects.value = true
  deleteCourseError.value = false
  try {
    await deleteSubjectById(item.id)
    selectedSubjectIds.value = selectedSubjectIds.value.filter(
      (id) => id !== item.id,
    )
    deletedSubjectCount.value = 1
    succcesDeleteCourse.value = true
    closeDelete()
  } catch {
    deleteCourseError.value = true
  } finally {
    deletingSubjects.value = false
  }
}

const close = () => {
  dialog.value = false
  subjectSchedules.value = undefined
  selectedSubject.value = undefined
}

const closeDelete = () => {
  dialogDelete.value = false
  selectedDelete.value = undefined
}

const openBulkDelete = () => {
  if (selectedSubjectIds.value.length > 0) dialogBulkDelete.value = true
}

const closeBulkDelete = () => {
  dialogBulkDelete.value = false
}

const deleteSelectedSubjects = async () => {
  const requestedCount = selectedSubjectIds.value.length
  deletingSubjects.value = true
  deleteCourseError.value = false
  try {
    await deleteSubjectsById([...selectedSubjectIds.value])
    selectedSubjectIds.value = []
    deletedSubjectCount.value = requestedCount
    succcesDeleteCourse.value = true
    closeBulkDelete()
  } catch {
    const existingIds = new Set(mySubjects.value.map((subject) => subject.id))
    selectedSubjectIds.value = selectedSubjectIds.value.filter((id) =>
      existingIds.has(id),
    )
    deleteCourseError.value = true
  } finally {
    deletingSubjects.value = false
  }
}

const succcesUpdateCourse = ref(false)
const updatingColor = ref(false)

const saveColor = async (item: IPlannedSubject, color: string) => {
  updatingColor.value = true
  try {
    await updateSubjectColor(item.id, color)
    succcesUpdateCourse.value = true
  } finally {
    updatingColor.value = false
  }
}

const save = async (
  data: PlannedSubject<PlannedSubjectId> | PlannedSubject<undefined>,
) => {
  succcesAddCourse.value = false
  if (data.id) {
    if (data.schedules && data.schedules.length > 0) {
      await updateSubject(data.toUpdateRequest())
      close()
      succcesUpdateCourse.value = true
    } else {
      deleteItem(data)
    }
  } else {
    await saveNewSubject(data.toCreateRequest())
    close()
    succcesAddCourse.value = true
  }
}

const search = ref('')

const { data: subjects, status: statusSubjects } = await useAsyncData(
  'search',
  async () => {
    const _search = search.value
    if (!_search) return []
    return findCatalogSubjects(_search)
  },
  {
    watch: [
      search,
      specialityId,
      studyPlanId,
      facultyId,
      hourlyLoad,
      localDataset,
    ],
    default: () => [],
  },
)
</script>

<style scoped>
.subjects-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 16px;
}
.subjects-heading h2 {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.4;
  font-weight: 500;
}
.subjects-heading__title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.subjects-heading--selected {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.subject-search {
  display: grid;
  gap: 12px;
  padding: 0 16px 16px;
}
.course-selection-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 4px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.course-selection-bar .v-input {
  flex: 0 1 auto;
}
.selection-delete {
  margin-left: auto;
}
.subjects-table :deep(th) {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.subjects-table :deep(td) {
  padding-block: 8px !important;
}
.subjects-table :deep(.v-data-table-header__select-all) {
  display: none;
}
.subjects-table :deep(.v-data-table__tr--mobile > td) {
  min-height: 32px;
  height: auto;
  padding-block: 4px !important;
  grid-template-columns: minmax(90px, 0.7fr) minmax(0, 1.3fr);
}
.subjects-table
  :deep(.v-data-table__tr--mobile > .v-data-table__td--select-row) {
  grid-template-columns: 1fr;
  padding-top: 12px !important;
}
.subjects-table :deep(.v-data-table__tr--mobile > td:last-child) {
  padding-bottom: 12px !important;
}
@media (max-width: 600px) {
  .subjects-heading > .v-btn {
    flex-grow: 1;
  }
  .selection-count {
    flex-basis: 100%;
  }
  .selection-delete {
    margin-left: 0;
  }
}
</style>
