import { describe, expect, it } from 'vitest'
import {
  eventTypeLabel,
  occurrencePresentation,
} from '../occurrences-presentation'

describe('occurrences presentation', () => {
  it.each([
    ['CROSSING_BASIS', 'Dentro de las horas permitidas'],
    ['CROSSING_NOT_AVAILABLE', 'Prácticas en simultáneo'],
    ['CROSSING_EXCEEDED', 'Excede las horas permitidas'],
  ])('replaces the internal code %s with a readable label', (type, label) => {
    expect(occurrencePresentation(type).label).toBe(label)
  })

  it('uses a safe generic label for an unknown occurrence', () => {
    expect(occurrencePresentation('UNKNOWN').label).toBe('Cruce no permitido')
  })

  it('expands known event type abbreviations', () => {
    expect(eventTypeLabel('T')).toBe('Teoría')
    expect(eventTypeLabel('P')).toBe('Práctica')
  })
})
