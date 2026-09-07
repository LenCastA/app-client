export const SUBJECT_HEADERS = [
  {
    title: 'Color',
    width: 64,
    align: 'center',
    value: 'color',
    sortable: false,
  },
  {
    title: 'Código',
    width: 88,
    value: 'subject.course.id',
    sortable: true,
  },
  {
    title: 'Nombre de curso',
    width: '28%',
    align: 'start',
    sortable: true,
    value: 'subject.course.name',
  },
  {
    title: 'Plan de estudios',
    width: 136,
    value: 'subject.studyPlan.name',
    sortable: true,
  },
  {
    title: 'Secciones',
    width: '28%',
    value: 'sections',
    sortable: true,
  },
  {
    title: 'Créditos',
    width: 80,
    align: 'center',
    value: 'subject.credits',
    sortable: true,
  },
  {
    title: 'Acciones',
    width: 96,
    align: 'center',
    value: 'actions',
    sortable: false,
  },
] as const
