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
export function sharesDay(a: Comision, b: Comision): boolean {
  const daysA = new Set(parseDias(a.dias).map(x => x.dia))
  return parseDias(b.dias).some(x => daysA.has(x.dia))
}

/**
 * Fast "does at least one valid combination exist?" check. Short-circuits on
 * the first success instead of enumerating every combination like
 * `getValidCombinations`. Ideal para chequeos por materia en la sidebar.
 */
export function hasAnyValidCombination(
  selectedMaterias: string[],
  allComisiones: Comision[],
  options: { excludeMismoDia?: boolean } = {}
): boolean {
  const { excludeMismoDia = false } = options
  if (selectedMaterias.length === 0) return false

  const groups = selectedMaterias.map(cod =>
    allComisiones.filter(c => c.codigoMateria === cod)
  )
  if (groups.some(g => g.length === 0)) return false

  let found = false
  const current: Comision[] = []

  function backtrack(index: number): void {
    if (found) return
    if (index === groups.length) {
      found = true
      return
    }
    for (const comision of groups[index]) {
      if (found) return
      let conflicts = false
      for (const c of current) {
        if (hasConflict(c, comision) || (excludeMismoDia && sharesDay(c, comision))) {
          conflicts = true
          break
        }
      }
      if (!conflicts) {
        current.push(comision)
        backtrack(index + 1)
        current.pop()
      }
    }
  }

  backtrack(0)
  return found
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

/**
 * When no valid combinations exist, diagnose *why*.
 *
 * - `emptyMaterias`: materias that ended up with 0 comisiones after the current
 *   filters (excluir turnos, sábado, etc). Quitando estas destraba todo.
 * - `conflictingPairs`: pares de materias donde *toda* comisión de A choca con
 *   *toda* comisión de B (o comparten día si `excludeMismoDia` está activo).
 *   Quitar cualquiera de las dos habilita nuevas combinaciones.
 *
 * No cubre conflictos de orden ≥ 3 (donde ningún par choca pero tres materias
 * juntas no entran), pero para los horarios típicos de la UNLaM los conflictos
 * suelen ser de pares.
 */
export function diagnoseConflicts(
  selectedMaterias: string[],
  filteredComisiones: Comision[],
  options: { excludeMismoDia?: boolean } = {}
): { emptyMaterias: string[]; conflictingPairs: Array<[string, string]> } {
  const { excludeMismoDia = false } = options
  const groups = new Map<string, Comision[]>()
  for (const cod of selectedMaterias) {
    groups.set(
      cod,
      filteredComisiones.filter(c => c.codigoMateria === cod)
    )
  }

  const emptyMaterias = selectedMaterias.filter(cod => (groups.get(cod) ?? []).length === 0)

  const conflictingPairs: Array<[string, string]> = []
  for (let i = 0; i < selectedMaterias.length; i++) {
    const codA = selectedMaterias[i]
    const groupA = groups.get(codA) ?? []
    if (groupA.length === 0) continue
    for (let j = i + 1; j < selectedMaterias.length; j++) {
      const codB = selectedMaterias[j]
      const groupB = groups.get(codB) ?? []
      if (groupB.length === 0) continue

      let hasNonConflicting = false
      outer: for (const a of groupA) {
        for (const b of groupB) {
          if (hasConflict(a, b)) continue
          if (excludeMismoDia && sharesDay(a, b)) continue
          hasNonConflicting = true
          break outer
        }
      }
      if (!hasNonConflicting) conflictingPairs.push([codA, codB])
    }
  }

  return { emptyMaterias, conflictingPairs }
}
