'use client'

import { useState, useMemo, useEffect, useDeferredValue, useCallback } from 'react'
import UniversitySelector from '@/components/UniversitySelector'
import MateriaSidebar from '@/components/MateriaSidebar'
import CombinationCard from '@/components/CombinationCard'
import { getValidCombinations, getTurno, esSabado, comisionId } from '@/lib/algorithm'
import type { OfertaData } from '@/lib/types'
import { MAX_MATERIAS } from '@/lib/types'
import { chipStyle } from '@/lib/colors'

type FilterKey = 'mañana' | 'tarde' | 'noche' | 'sabado' | 'mismo-dia'

export default function Home() {
  const [ofertaData, setOfertaData] = useState<OfertaData | null>(null)
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([])
  const [excludedFilters, setExcludedFilters] = useState<Set<FilterKey>>(new Set())
  const [isDark, setIsDark] = useState(false)

  // Sync dark class on <html> and read system preference on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(prefersDark)
  }, [])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Defer heavy computation so UI stays responsive while typing/interacting
  const deferredMaterias = useDeferredValue(selectedMaterias)
  const deferredExcluded = useDeferredValue(excludedFilters)

  // Deduplicate comisiones: the source data can contain exact duplicates
  // (same materia/slot/modalidad/sede) which would create phantom combinations.
  const uniqueComisiones = useMemo(() => {
    if (!ofertaData) return []
    const seen = new Set<string>()
    return ofertaData.comisiones.filter(c => {
      const id = comisionId(c)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [ofertaData])

  // Comisiones filtered by the per-comision checkboxes (turnos + sábado)
  const filteredComisiones = useMemo(() => {
    if (deferredExcluded.size === 0) return uniqueComisiones
    return uniqueComisiones.filter(c => {
      if (deferredExcluded.has('sabado') && esSabado(c.dias)) return false
      const turno = getTurno(c.dias)
      if (turno && deferredExcluded.has(turno)) return false
      return true
    })
  }, [uniqueComisiones, deferredExcluded])

  const { combinations, total } = useMemo(() => {
    if (!ofertaData || deferredMaterias.length === 0) return { combinations: [], total: 0 }
    return getValidCombinations(deferredMaterias, filteredComisiones, {
      excludeMismoDia: deferredExcluded.has('mismo-dia'),
    })
  }, [deferredMaterias, filteredComisiones, deferredExcluded, ofertaData])

  // Color map: codigoMateria → index in MATERIA_COLORS
  const colorMap = useMemo(() => {
    const map = new Map<string, number>()
    selectedMaterias.forEach((cod, i) => map.set(cod, i))
    return map
  }, [selectedMaterias])

  const handleAddMateria = useCallback((codigo: string) => {
    setSelectedMaterias(prev =>
      prev.length < MAX_MATERIAS && !prev.includes(codigo)
        ? [...prev, codigo]
        : prev
    )
  }, [])

  const handleRemoveMateria = useCallback((codigo: string) => {
    setSelectedMaterias(prev => prev.filter(c => c !== codigo))
  }, [])

  const handleToggleFilter = useCallback((key: FilterKey) => {
    setExcludedFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const isComputing =
    deferredMaterias !== selectedMaterias || deferredExcluded !== excludedFilters

  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const textColor = isDark ? '#f1f5f9' : '#0f172a'
  const mutedColor = isDark ? '#94a3b8' : '#64748b'
  const bgHeader = isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)'

  return (
    <>
      {/* Dot pattern background */}
      <div
        className="dot-pattern fixed inset-0 -z-10"
        style={{ opacity: isDark ? 0.25 : 0.4 }}
      />

      {/* App shell */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header
          className="shrink-0 flex items-center gap-3 px-4 py-3 z-10"
          style={{
            background: bgHeader,
            borderBottom: `1px solid ${borderColor}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate" style={{ color: textColor }}>
              ¿A qué comisión me anoto?
            </h1>
            {ofertaData && (
              <p className="text-xs leading-tight" style={{ color: mutedColor }}>
                {ofertaData.universidad} · {ofertaData.carrera} · {ofertaData.periodo}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ofertaData && (
              <button
                onClick={() => { setOfertaData(null); setSelectedMaterias([]) }}
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{
                  color: mutedColor,
                  border: `1px solid ${borderColor}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = textColor)}
                onMouseLeave={e => (e.currentTarget.style.color = mutedColor)}
              >
                Cambiar
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDark(d => !d)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ border: `1px solid ${borderColor}`, color: mutedColor }}
              onMouseEnter={e => (e.currentTarget.style.color = textColor)}
              onMouseLeave={e => (e.currentTarget.style.color = mutedColor)}
              aria-label="Cambiar tema"
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Body: sidebar + main */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          {ofertaData && (
            <div className="w-60 shrink-0 overflow-y-auto">
              <MateriaSidebar
                comisiones={uniqueComisiones}
                selectedMaterias={selectedMaterias}
                colorMap={colorMap}
                isDark={isDark}
                onAdd={handleAddMateria}
                onRemove={handleRemoveMateria}
              />
            </div>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {!ofertaData ? (
              // Placeholder while selector overlay is shown
              <div className="h-full flex items-center justify-center">
                <p style={{ color: mutedColor }} className="text-sm">Cargando…</p>
              </div>
            ) : selectedMaterias.length === 0 ? (
              <EmptyState isDark={isDark} textColor={textColor} mutedColor={mutedColor} />
            ) : (
              <div className="p-4 flex flex-col gap-4">
                {/* Filters */}
                <TurnoFilters
                  excluded={excludedFilters}
                  onToggle={handleToggleFilter}
                  isDark={isDark}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={borderColor}
                />

                {/* Status bar */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedMaterias.map(cod => {
                      const colorIdx = colorMap.get(cod) ?? 0
                      const nombre = ofertaData.comisiones.find(c => c.codigoMateria === cod)?.descripcion ?? cod
                      return (
                        <span
                          key={cod}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={chipStyle(colorIdx, isDark)}
                        >
                          <span className="max-w-[120px] truncate">{nombre}</span>
                        </span>
                      )
                    })}
                  </div>
                  <div className="ml-auto shrink-0 flex items-center gap-2">
                    {isComputing && (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke={mutedColor} strokeWidth="2" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke={textColor} strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                    <span className="text-sm font-semibold" style={{ color: textColor }}>
                      {total === 0 ? (
                        <span style={{ color: '#ef4444' }}>Sin combinaciones válidas</span>
                      ) : (
                        <>
                          <span style={{ color: '#22c55e' }}>{combinations.length}</span>
                          {total > combinations.length && (
                            <span style={{ color: mutedColor }}> / {total}</span>
                          )}
                          <span style={{ color: mutedColor }}> combinaciones</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Combination cards: single column stack, scrollable */}
                {combinations.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {combinations.map((combo, i) => (
                      <CombinationCard
                        key={combo.map(comisionId).join('|')}
                        combination={combo}
                        colorMap={colorMap}
                        isDark={isDark}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  !isComputing && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <span className="text-4xl">🚫</span>
                      <p className="font-semibold" style={{ color: textColor }}>
                        Sin combinaciones posibles
                      </p>
                      <p className="text-sm text-center max-w-xs" style={{ color: mutedColor }}>
                        No existe ninguna forma de cursar todas las materias seleccionadas sin conflictos de horario.
                        Probá quitando alguna materia.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* University selector overlay */}
      {!ofertaData && (
        <UniversitySelector onSelect={setOfertaData} isDark={isDark} />
      )}
    </>
  )
}

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'mañana', label: 'Mañana' },
  { key: 'tarde', label: 'Tarde' },
  { key: 'noche', label: 'Noche' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'mismo-dia', label: 'Mismo día' },
]

function TurnoFilters({
  excluded, onToggle, isDark, textColor, mutedColor, borderColor,
}: {
  excluded: Set<FilterKey>
  onToggle: (key: FilterKey) => void
  isDark: boolean
  textColor: string
  mutedColor: string
  borderColor: string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: mutedColor }}>
        Excluir:
      </span>
      {FILTER_OPTIONS.map(({ key, label }) => {
        const active = excluded.has(key)
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{
              border: `1px solid ${active ? '#6366f1' : borderColor}`,
              background: active ? (isDark ? '#312e81' : '#eef2ff') : 'transparent',
              color: active ? (isDark ? '#c7d2fe' : '#4338ca') : textColor,
            }}
          >
            <span
              className="flex items-center justify-center rounded"
              style={{
                width: 16,
                height: 16,
                border: `1.5px solid ${active ? '#6366f1' : mutedColor}`,
                background: active ? '#6366f1' : 'transparent',
              }}
            >
              {active && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5L5 9L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function EmptyState({
  isDark, textColor, mutedColor,
}: {
  isDark: boolean
  textColor: string
  mutedColor: string
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ background: isDark ? '#1e293b' : '#f1f5f9' }}
      >
        📅
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ color: textColor }}>
          Elegí tus materias
        </p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: mutedColor }}>
          Buscá y agregá materias en el panel izquierdo para ver todas las combinaciones de comisiones posibles.
        </p>
      </div>
      <div
        className="flex items-center gap-2 text-sm rounded-xl px-4 py-2"
        style={{ background: isDark ? '#1e293b' : '#f8fafc', color: mutedColor }}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Podés agregar hasta {MAX_MATERIAS} materias
      </div>
    </div>
  )
}
