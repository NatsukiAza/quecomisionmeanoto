import type { Comision } from './types'

const DIAS_RE = /(?:Lu|Ma|Mi|Ju|Vi|Sa){1,3}\d{2}a\d{2}/
const MODALIDADES = ['Sincrónica Teams', 'Semipresencial', 'Presencial', 'Virtual', 'Aula Virtual']
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

      let modalidad = 'Presencial'
      let observacion: string | undefined
      for (const m of MODALIDADES) {
        if (after.toLowerCase().startsWith(m.toLowerCase())) {
          modalidad = m
          const rest = after.slice(m.length).trim()
          if (rest) observacion = rest
          break
        }
      }
      if (modalidad === 'Presencial' && !MODALIDADES.some(m => after.toLowerCase().startsWith(m.toLowerCase()))) {
        if (after) observacion = after
      }

      // Lookahead for sede
      const sedeParts: string[] = []
      let j = i + 1
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

      if (!currentCodigo || !codComision) continue

      const comision: Comision = {
        codigoMateria: currentCodigo,
        descripcion: currentNombre,
        codComision,
        dias,
        modalidad,
        sede: sedeParts.join(' ') || 'San Justo',
      }
      if (observacion) comision.observacion = observacion
      comisiones.push(comision)

    } else {
      const isComisionCodeLine =
        /^\d{4}\s+(?:Lu|Ma|Mi|Ju|Vi|Sa)/.test(line) && DIAS_RE.test(line)

      const nm = !isComisionCodeLine && line.match(/^(\d{4})\s+(.+)/)
      if (nm) {
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
