'use client'

import { useState, useMemo } from 'react'
import type { Comision } from '@/lib/types'
import { MAX_MATERIAS } from '@/lib/types'
import { getMaterias } from '@/lib/algorithm'
import { chipStyle } from '@/lib/colors'

interface Props {
  comisiones: Comision[]
  selectedMaterias: string[]
  colorMap: Map<string, number>
  isDark: boolean
  onAdd: (codigo: string) => void
  onRemove: (codigo: string) => void
  /**
   * Materias que, si se agregan, dejan al planner sin combinaciones válidas
   * bajo los filtros/pines actuales. Se pintan en rojo con un "!" pero siguen
   * siendo seleccionables.
   */
  problematicMaterias?: Set<string>
}

export default function MateriaSidebar({
  comisiones,
  selectedMaterias,
  colorMap,
  isDark,
  onAdd,
  onRemove,
  problematicMaterias,
}: Props) {
  const [search, setSearch] = useState('')

  const allMaterias = useMemo(() => getMaterias(comisiones), [comisiones])

  const filteredMaterias = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allMaterias.filter(
      m =>
        !selectedMaterias.includes(m.codigo) &&
        (q === '' || m.nombre.toLowerCase().includes(q) || m.codigo.includes(q))
    )
  }, [allMaterias, selectedMaterias, search])

  const atLimit = selectedMaterias.length >= MAX_MATERIAS

  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const bgSurface = isDark ? '#1e293b' : '#ffffff'
  const bgSurface2 = isDark ? '#0f172a' : '#f8fafc'
  const textColor = isDark ? '#f1f5f9' : '#0f172a'
  const mutedColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: bgSurface, borderRight: `1px solid ${borderColor}` }}
    >
      {/* Search */}
      <div className="p-3 pb-2" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 20 20" fill="none"
          >
            <circle cx="9" cy="9" r="6" stroke={mutedColor} strokeWidth="2" />
            <path d="M13.5 13.5L17 17" stroke={mutedColor} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar materia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: bgSurface2,
              border: `1px solid ${borderColor}`,
              color: textColor,
            }}
          />
        </div>
      </div>

      {/* Selected materias */}
      {selectedMaterias.length > 0 && (
        <div className="p-3 pb-2 flex flex-col gap-1.5" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: mutedColor }}>
            Seleccionadas ({selectedMaterias.length}/{MAX_MATERIAS})
          </span>
          <div className="flex flex-col gap-1">
            {selectedMaterias.map(codigo => {
              const materia = allMaterias.find(m => m.codigo === codigo)
              const colorIdx = colorMap.get(codigo) ?? 0
              const cs = chipStyle(colorIdx, isDark)
              const comisionCount = comisiones.filter(c => c.codigoMateria === codigo).length
              return (
                <div
                  key={codigo}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={cs}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight truncate">
                      {materia?.nombre ?? codigo}
                    </p>
                    <p className="text-xs opacity-70">
                      {comisionCount} com.
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(codigo)}
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                    aria-label={`Quitar ${materia?.nombre}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available materias list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {selectedMaterias.length === 0 && (
          <span className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: mutedColor }}>
            Materias disponibles
          </span>
        )}

        {filteredMaterias.length === 0 && search && (
          <p className="text-xs text-center py-4" style={{ color: mutedColor }}>
            Sin resultados para "{search}"
          </p>
        )}

        {filteredMaterias.map(materia => {
          const comisionCount = comisiones.filter(c => c.codigoMateria === materia.codigo).length
          const problematic = problematicMaterias?.has(materia.codigo) ?? false
          // Rojos coherentes con dark/light
          const redText = isDark ? '#fca5a5' : '#b91c1c'
          const redMuted = isDark ? '#f87171' : '#dc2626'
          const redHover = isDark ? 'rgba(220, 38, 38, 0.18)' : '#fee2e2'
          const restingBg = problematic ? (isDark ? 'rgba(220, 38, 38, 0.08)' : '#fef2f2') : 'transparent'
          const hoverBg = problematic ? redHover : (isDark ? '#334155' : '#f1f5f9')
          return (
            <button
              key={materia.codigo}
              onClick={() => !atLimit && onAdd(materia.codigo)}
              disabled={atLimit}
              className="w-full text-left rounded-lg px-2.5 py-2 text-sm transition-colors flex items-start gap-2"
              style={{
                color: atLimit ? mutedColor : (problematic ? redText : textColor),
                cursor: atLimit ? 'not-allowed' : 'pointer',
                opacity: atLimit ? 0.5 : 1,
                background: restingBg,
              }}
              title={
                problematic
                  ? 'Agregar esta materia te va a dejar sin combinaciones válidas'
                  : undefined
              }
              onMouseEnter={e => {
                if (!atLimit) {
                  (e.currentTarget as HTMLButtonElement).style.background = hoverBg
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = restingBg
              }}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-medium leading-tight">
                  {materia.nombre}
                </span>
                <span
                  className="block text-xs mt-0.5"
                  style={{ color: problematic ? redMuted : mutedColor }}
                >
                  {comisionCount} comisión{comisionCount !== 1 ? 'es' : ''}
                </span>
              </span>
              {problematic && (
                <span
                  className="shrink-0 inline-flex items-center justify-center rounded-full font-bold"
                  style={{
                    width: 18,
                    height: 18,
                    background: redMuted,
                    color: '#ffffff',
                    fontSize: 11,
                    lineHeight: 1,
                    marginTop: 1,
                  }}
                  aria-label="Advertencia"
                >
                  !
                </span>
              )}
            </button>
          )
        })}

        {atLimit && (
          <p className="text-xs text-center py-3 mt-2 rounded-lg" style={{ color: mutedColor, background: isDark ? '#1e293b' : '#f8fafc' }}>
            Límite de {MAX_MATERIAS} materias alcanzado
          </p>
        )}
      </div>
    </aside>
  )
}
