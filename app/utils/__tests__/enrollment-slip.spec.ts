import { describe, expect, it } from 'vitest'
import {
  parseEnrollmentSlipText,
  type PositionedPdfText,
} from '../enrollment-slip'

const item = (text: string, x: number, y: number): PositionedPdfText => ({
  text,
  x,
  y,
})

describe('parseEnrollmentSlipText', () => {
  it('extracts and deduplicates course-section pairs across pages', () => {
    const result = parseEnrollmentSlipText([
      [
        item('BOLETA DE MATRÍCULA · PERIODO 2026-2', 100, 700),
        item('FB405', 58, 218),
        item('U', 113, 218),
        item('Viernes', 141, 218),
        item('FB405', 58, 201),
        item('U', 113, 201),
        item('Sábado', 141, 201),
      ],
      [item('SW708', 58, 567), item('U', 113, 567)],
    ])

    expect(result).toEqual([
      { courseCode: 'FB405', section: 'U' },
      { courseCode: 'SW708', section: 'U' },
    ])
  })

  it('accepts accents split across a nearby PDF baseline', () => {
    expect(
      parseEnrollmentSlipText([
        [
          item('BOLETA DE MATRICULA', 100, 700),
          item('SW609', 58, 618.2),
          item('u', 113, 618.9),
        ],
      ]),
    ).toEqual([{ courseCode: 'SW609', section: 'U' }])
  })

  it('rejects unrelated PDFs', () => {
    expect(() =>
      parseEnrollmentSlipText([[item('Estado de cuenta', 10, 10)]]),
    ).toThrow('no parece ser una boleta')
  })

  it('reports a valid slip without course rows', () => {
    expect(() =>
      parseEnrollmentSlipText([[item('BOLETA DE MATRÍCULA', 10, 10)]]),
    ).toThrow('No se encontraron cursos')
  })
})
