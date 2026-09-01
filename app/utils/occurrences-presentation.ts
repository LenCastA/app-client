import {
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiCheckCircleOutline,
} from '@mdi/js'

const OCCURRENCE_PRESENTATIONS: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  CROSSING_BASIS: {
    label: 'Dentro de las horas permitidas',
    color: 'success',
    icon: mdiCheckCircleOutline,
  },
  CROSSING_NOT_AVAILABLE: {
    label: 'Prácticas en simultáneo',
    color: 'error',
    icon: mdiAlertCircleOutline,
  },
  CROSSING_EXCEEDED: {
    label: 'Excede las horas permitidas',
    color: 'error',
    icon: mdiAlertOutline,
  },
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  T: 'Teoría',
  THEORY: 'Teoría',
  P: 'Práctica',
  PRACTICE: 'Práctica',
  PC: 'Práctica calificada',
  L: 'Laboratorio',
  LABORATORY: 'Laboratorio',
  MY_EVENT: 'Actividad personal',
}

export const occurrencePresentation = (type: string) =>
  OCCURRENCE_PRESENTATIONS[type] ?? {
    label: 'Cruce no permitido',
    color: 'warning',
    icon: mdiAlertOutline,
  }

export const eventTypeLabel = (type: string) => EVENT_TYPE_LABELS[type] ?? type
