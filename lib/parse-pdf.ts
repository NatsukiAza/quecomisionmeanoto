import type { Comision } from './types'

const DIAS_RE = /(?:Lu|Ma|Mi|Ju|Vi|Sa){1,3}\d{2}a\d{2}/
// Longer names first so "Aula Virtual" wins over "Virtual", etc.
const MODALIDADES = [
  'Sincrónica Teams',
  'Semipresencial',
  'A Distancia',
  'Recursantes',
  'Aula Virtual',
  'Presencial',
  'Virtual',
]
const INCOMPLETE_SEDES = ['San', 'Buenos']

function isNoiseLine(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (t.startsWith('(http')) return true
  if (t.startsWith('https://') || t.startsWith('http://')) return true
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) return true
  if (t.includes('Intraconsulta')) return true
  if (/unlam\.edu\.ar/.test(t) && !DIAS_RE.test(t)) return true
  if (/^(Código|Descripción|Cod\.?|Comisión|Turno|Días|Modalidad|Sede|Observacion)\s*$/.test(t)) return true
  if (/^\d+\/\d+\s*$/.test(t)) return true
  return false
}

function extractModalidad(after: string): { modalidad: string; observacion?: string } {
  const trimmed = after.trim()
  if (!trimmed) return { modalidad: 'Presencial' }

  for (const m of MODALIDADES) {
    const ml = m.toLowerCase()
    const lower = trimmed.toLowerCase()
    if (!lower.startsWith(ml)) continue
    const boundary = lower[ml.length]
    if (boundary !== undefined && boundary !== ' ' && boundary !== '\t') continue

    let rest = trimmed.slice(m.length).trim()
    // PDF sometimes repeats the modalidad in Turno + Modalidad columns:
    // "A distancia A Distancia"
    if (rest.toLowerCase() === ml) rest = ''
    else if (rest.toLowerCase().startsWith(ml)) {
      const b2 = rest.toLowerCase()[ml.length]
      if (b2 === undefined || b2 === ' ' || b2 === '\t') {
        rest = rest.slice(m.length).trim()
      }
    }
    return { modalidad: m, observacion: rest || undefined }
  }

  return { modalidad: 'Presencial', observacion: trimmed }
}

function lookAheadSede(lines: string[], from: number): string {
  const sedeParts: string[] = []
  let j = from
  while (j < lines.length) {
    const nxt = lines[j]
    if (DIAS_RE.test(nxt) || /^\d{4}\s/.test(nxt)) break
    if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(nxt) && nxt.length <= 25) {
      sedeParts.push(nxt)
      j++
      if (!INCOMPLETE_SEDES.includes(sedeParts.join(' '))) break
    } else {
      break
    }
  }
  return sedeParts.join(' ') || 'San Justo'
}

function startsWithModalidad(text: string): boolean {
  const lower = text.trim().toLowerCase()
  return MODALIDADES.some(m => {
    const ml = m.toLowerCase()
    if (!lower.startsWith(ml)) return false
    const next = lower[ml.length]
    return next === undefined || next === ' ' || next === '\t'
  })
}

export function parseComisionesFromText(text: string): Comision[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => !isNoiseLine(l))

  const comisiones: Comision[] = []
  let currentCodigo = ''
  let currentNombre = ''
  let nameMode = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const diasMatch = line.match(DIAS_RE)

    if (diasMatch) {
      nameMode = false
      const dias = diasMatch[0]
      const diasIdx = line.indexOf(dias)
      const before = line.substring(0, diasIdx).trim()
      const after = line.substring(diasIdx + dias.length).trim()

      const codMatch = before.match(/(\d{4})\s*$/)
      const codComision = codMatch ? codMatch[1] : ''
      const materiaPrefix = codMatch
        ? before.substring(0, before.lastIndexOf(codMatch[0])).trim()
        : before

      if (materiaPrefix) {
        const nm = materiaPrefix.match(/^(\d{4})\s+([A-ZÁÉÍÓÚÑ].+)/)
        if (nm && !/^(?:Lu|Ma|Mi|Ju|Vi|Sa)/.test(nm[2])) {
          currentCodigo = nm[1]
          currentNombre = nm[2].trim()
        }
      }

      const { modalidad, observacion } = extractModalidad(after)
      const sede = lookAheadSede(lines, i + 1)

      if (!currentCodigo || !codComision) continue

      const comision: Comision = {
        codigoMateria: currentCodigo,
        descripcion: currentNombre,
        codComision,
        dias,
        modalidad,
        sede,
      }
      if (observacion) comision.observacion = observacion
      comisiones.push(comision)

    } else {
      // Commission without fixed schedule, e.g. "6900 A distancia A Distancia"
      const sinHorario = line.match(/^(\d{4})\s+(.+)$/)
      if (
        sinHorario &&
        currentCodigo &&
        startsWithModalidad(sinHorario[2]) &&
        !/^[A-ZÁÉÍÓÚÑ].+\s+\d{4}\s+/.test(line) // not a materia+comisión header row
      ) {
        nameMode = false
        const codComision = sinHorario[1]
        const { modalidad, observacion } = extractModalidad(sinHorario[2])
        const sede = lookAheadSede(lines, i + 1)

        const comision: Comision = {
          codigoMateria: currentCodigo,
          descripcion: currentNombre,
          codComision,
          dias: '',
          modalidad,
          sede,
        }
        if (observacion) comision.observacion = observacion
        comisiones.push(comision)
        continue
      }

      const isComisionCodeLine =
        /^\d{4}\s+(?:Lu|Ma|Mi|Ju|Vi|Sa)/.test(line) && DIAS_RE.test(line)

      const nm = !isComisionCodeLine && line.match(/^(\d{4})\s+(.+)/)
      if (nm && !startsWithModalidad(nm[2])) {
        currentCodigo = nm[1]
        currentNombre = nm[2].trim()
        nameMode = true
      } else if (!isComisionCodeLine && nameMode && /^[A-ZÁÉÍÓÚÑ]/.test(line) &&
        !/^(San|Justo|Ituzaingó|Ituzaingo|Buenos|Aires)\s*$/.test(line)) {
        currentNombre += ' ' + line.trim()
      } else if (!isComisionCodeLine) {
        nameMode = false
      }
    }
  }

  return comisiones
}
