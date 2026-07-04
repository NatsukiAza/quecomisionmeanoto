import type { Comision, Combinacion, HorarioParsed } from './types'

const DAY_RE = /Lu|Ma|Mi|Ju|Vi|Sa/g

/**
 * Parse a dias string into one or more time blocks.
 * "Lu08a12"   → [{ dia:"Lu", inicio:8, fin:12 }]
 * "LuVi12a14" → [{ dia:"Lu", inicio:12, fin:14 }, { dia:"Vi", inicio:12, fin:14 }]
 */
export function parseDias(dias: string): HorarioParsed[] {
  const timeMatch = dias.match(/(\d{2})a(\d{2})$/)
  if (!timeMatch) return []
  const inicio = parseInt(timeMatch[1], 10)
  const fin = parseInt(timeMatch[2], 10)
  const daysStr = dias.substring(0, dias.indexOf(timeMatch[0]))
  const days = daysStr.match(DAY_RE) ?? []
  return days.map(dia => ({ dia, inicio, fin }))
}

/**
 * Returns true if two comisiones have at least one overlapping time block.
 * Overlap: a.inicio < b.fin AND b.inicio < a.fin, on the same day.
 */
export function hasConflict(a: Comision, b: Comision): boolean {
  const blocksA = parseDias(a.dias)
  const blocksB = parseDias(b.dias)
  for (const ba of blocksA) {
    for (const bb of blocksB) {
      if (ba.dia === bb.dia && ba.inicio < bb.fin && bb.inicio < ba.fin) {
        return true
      }
    }
  }
  return false
}

/**
 * Stable unique identifier for a comision.
 * codComision alone is NOT unique: it encodes a time slot reused across materias
 * (and even within one materia across different modalidades), so we combine several fields.
 */
export function comisionId(c: Comision): string {
  return `${c.codigoMateria}-${c.codComision}-${c.dias}-${c.modalidad}-${c.sede}`
}

/**
 * Returns the set of unique days a comision occupies.
 */
export function getDiasComision(dias: string): string[] {
  return [...new Set(parseDias(dias).map(b => b.dia))]
}

/** True if a comision has any block on Saturday. */
export function esSabado(dias: string): boolean {
  return parseDias(dias).some(b => b.dia === 'Sa')
}

/** True if two comisiones share at least one day (regardless of time overlap). */
function sharesDay(a: Comision, b: Comision): boolean {
  const daysA = new Set(parseDias(a.dias).map(x => x.dia))
  return parseDias(b.dias).some(x => daysA.has(x.dia))
}

/**
 * Find all valid combinations using backtracking (prunes conflicting branches early).
 * Much faster than cartesian product for cases with many comisiones per materia.
 */
export function getValidCombinations(
  selectedMaterias: string[],
  allComisiones: Comision[],
  options: { limit?: number; excludeMismoDia?: boolean } = {}
): { combinations: Combinacion[]; total: number } {
  const { limit = 200, excludeMismoDia = false } = options
  if (selectedMaterias.length === 0) return { combinations: [], total: 0 }

  const groups = selectedMaterias.map(cod =>
    allComisiones.filter(c => c.codigoMateria === cod)
  )

  if (groups.some(g => g.length === 0)) return { combinations: [], total: 0 }

  const results: Combinacion[] = []
  let total = 0

  function backtrack(index: number, current: Comision[]): void {
    if (index === groups.length) {
      total++
      if (results.length < limit) results.push([...current])
      return
    }
    for (const comision of groups[index]) {
      const conflictsWithCurrent = current.some(c =>
        hasConflict(c, comision) || (excludeMismoDia && sharesDay(c, comision))
      )
      if (!conflictsWithCurrent) {
        current.push(comision)
        backtrack(index + 1, current)
        current.pop()
      }
    }
  }

  backtrack(0, [])
  return { combinations: results, total }
}

export type Turno = 'mañana' | 'tarde' | 'noche'

/**
 * Classify a comision by turno based on the start hour of its first block.
 * Mañana: inicio < 13 · Tarde: 13 ≤ inicio < 18 · Noche: inicio ≥ 18
 */
export function getTurno(dias: string): Turno | null {
  const blocks = parseDias(dias)
  if (blocks.length === 0) return null
  const inicio = blocks[0].inicio
  if (inicio < 13) return 'mañana'
  if (inicio < 18) return 'tarde'
  return 'noche'
}

/**
 * Returns all unique materias sorted alphabetically.
 */
export function getMaterias(
  comisiones: Comision[]
): { codigo: string; nombre: string }[] {
  const seen = new Map<string, string>()
  for (const c of comisiones) {
    if (!seen.has(c.codigoMateria)) seen.set(c.codigoMateria, c.descripcion)
  }
  return Array.from(seen.entries())
    .map(([codigo, nombre]) => ({ codigo, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}
