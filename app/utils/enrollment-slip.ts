export interface EnrollmentSlipEntry {
  courseCode: string
  section: string
}

export interface PositionedPdfText {
  text: string
  x: number
  y: number
}

const COURSE_CODE_PATTERN = /^[A-Z]{2,5}\d{2,4}[A-Z]?$/
const SECTION_PATTERN = /^[A-Z0-9]{1,3}$/

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()

export function parseEnrollmentSlipText(
  pages: PositionedPdfText[][],
): EnrollmentSlipEntry[] {
  const allText = normalize(
    pages.flatMap((page) => page.map((item) => item.text)).join(' '),
  )
  if (!allText.includes('BOLETA DE MATRICULA')) {
    throw new Error(
      'El archivo no parece ser una boleta de matrícula de la UNI.',
    )
  }

  const entries = new Map<string, EnrollmentSlipEntry>()
  for (const page of pages) {
    const rows = new Map<number, PositionedPdfText[]>()
    for (const item of page) {
      const key = Math.round(item.y)
      const existingKey = [...rows.keys()].find(
        (candidate) => Math.abs(candidate - key) <= 1,
      )
      const rowKey = existingKey ?? key
      rows.set(rowKey, [...(rows.get(rowKey) ?? []), item])
    }

    for (const row of rows.values()) {
      const cells = row
        .filter((item) => item.text.trim())
        .sort((left, right) => left.x - right.x)
      const courseIndex = cells.findIndex((item) =>
        COURSE_CODE_PATTERN.test(normalize(item.text)),
      )
      if (courseIndex < 0) continue

      const courseCell = cells[courseIndex]
      if (!courseCell) continue
      const sectionCell = cells
        .slice(courseIndex + 1)
        .find(
          (item) =>
            item.x > courseCell.x &&
            item.x - courseCell.x <= 90 &&
            SECTION_PATTERN.test(normalize(item.text)),
        )
      if (!sectionCell) continue

      const courseCode = normalize(courseCell.text)
      const section = normalize(sectionCell.text)
      entries.set(`${courseCode}:${section}`, { courseCode, section })
    }
  }

  if (entries.size === 0) {
    throw new Error('No se encontraron cursos y secciones en la boleta.')
  }
  return [...entries.values()]
}

export async function readEnrollmentSlipPdf(
  file: File,
): Promise<EnrollmentSlipEntry[]> {
  const { GlobalWorkerOptions, getDocument } =
    await import('pdfjs-dist/legacy/build/pdf.mjs')
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  })
  const document = await loadingTask.promise
  const pages: PositionedPdfText[][] = []

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(
        content.items.flatMap((item) => {
          if (!('str' in item) || !item.str.trim()) return []
          return [
            {
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
            },
          ]
        }),
      )
    }
  } finally {
    await loadingTask.destroy()
  }

  return parseEnrollmentSlipText(pages)
}
