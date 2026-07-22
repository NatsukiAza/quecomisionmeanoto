'use client'

import { useEffect, useMemo } from 'react'
import type { Comision } from '@/lib/types'
import { comisionId, esSabado, getTurno } from '@/lib/algorithm'
import { chipStyle } from '@/lib/colors'

export type FilterKey = 'mañana' | 'tarde' | 'noche' | 'sabado' | 'mismo-dia'

interface Props {
  open: boolean
  onClose: () => void
  isDark: boolean
  excluded: Set<FilterKey>
  onToggleExclude: (key: FilterKey) => void
  selectedMaterias: string[]
  comisiones: Comision[]
  colorMap: Map<string, number>
  pinnedComisiones: Set<string>
  onTogglePin: (id: string) => void
  onClearAll: () => void
}

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'mañana', label: 'Mañana' },
  { key: 'tarde', label: 'Tarde' },
  { key: 'noche', label: 'Noche' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'mismo-dia', label: 'Mismo día' },
]

export default function FiltersModal({
  open,
  onClose,
  isDark,
  excluded,
  onToggleExclude,
  selectedMaterias,
  comisiones,
  colorMap,
  pinnedComisiones,
  onTogglePin,
  onClearAll,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent background scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Group comisiones by materia, ordered by selectedMaterias order
  const grouped = useMemo(() => {
    const byMateria = new Map<string, Comision[]>()
    for (const cod of selectedMaterias) byMateria.set(cod, [])
    for (const c of comisiones) {
      const arr = byMateria.get(c.codigoMateria)
      if (arr) arr.push(c)
    }
    for (const arr of byMateria.values()) {
      arr.sort((a, b) => a.dias.localeCompare(b.dias) || a.codComision.localeCompare(b.codComision))
    }
    return selectedMaterias
      .map(cod => ({
        codigo: cod,
        nombre: byMateria.get(cod)?.[0]?.descripcion ?? cod,
        comisiones: byMateria.get(cod) ?? [],
      }))
      .filter(g => g.comisiones.length > 0)
  }, [comisiones, selectedMaterias])

  if (!open) return null

  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const bgSurface = isDark ? '#0f172a' : '#ffffff'
  const bgSurface2 = isDark ? '#1e293b' : '#f8fafc'
  const textColor = isDark ? '#f1f5f9' : '#0f172a'
  const mutedColor = isDark ? '#94a3b8' : '#64748b'

  const totalFilters = excluded.size + pinnedComisiones.size

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Filtros"
    >
      <div
        className="rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: bgSurface,
          border: `1px solid ${borderColor}`,
          maxHeight: 'min(90vh, 720px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <h2 className="text-lg font-bold flex-1" style={{ color: textColor }}>
            Filtros
          </h2>
          {totalFilters > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: isDark ? '#312e81' : '#eef2ff',
                color: isDark ? '#c7d2fe' : '#4338ca',
              }}
            >
              {totalFilters} activo{totalFilters !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: mutedColor, border: `1px solid ${borderColor}` }}
            onMouseEnter={e => (e.currentTarget.style.color = textColor)}
            onMouseLeave={e => (e.currentTarget.style.color = mutedColor)}
            aria-label="Cerrar"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Excluir section */}
          <section className="flex flex-col gap-2">
            <h3
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: mutedColor }}
            >
              Excluir
            </h3>
            <p className="text-xs" style={{ color: mutedColor }}>
              Descartá turnos, sábado o combinaciones con dos materias el mismo día.
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {FILTER_OPTIONS.map(({ key, label }) => {
                const active = excluded.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => onToggleExclude(key)}
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
                          <path
                            d="M2.5 6.5L5 9L9.5 3.5"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Fijar section */}
          {grouped.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: mutedColor }}
                >
                  Fijar comisión
                </h3>
                <p className="text-xs" style={{ color: mutedColor }}>
                  Elegí una comisión específica para forzarla en todas las combinaciones.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {grouped.map(g => {
                  const colorIdx = colorMap.get(g.codigo) ?? 0
                  return (
                    <div
                      key={g.codigo}
                      className="flex flex-col gap-2 rounded-xl p-3"
                      style={{
                        background: bgSurface2,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                          style={chipStyle(colorIdx, isDark)}
                        >
                          {g.nombre}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: mutedColor }}>
                          {g.comisiones.length} comisión{g.comisiones.length !== 1 ? 'es' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {g.comisiones.map(c => {
                          const id = comisionId(c)
                          const pinned = pinnedComisiones.has(id)
                          const excludedByFilters =
                            (excluded.has('sabado') && esSabado(c.dias)) ||
                            (() => {
                              const t = getTurno(c.dias)
                              return t !== null && excluded.has(t)
                            })()
                          return (
                            <button
                              key={id}
                              onClick={() => onTogglePin(id)}
                              className="text-left rounded-lg px-2.5 py-2 text-xs transition-colors flex items-start gap-2"
                              style={{
                                border: `1px solid ${pinned ? '#6366f1' : borderColor}`,
                                background: pinned
                                  ? (isDark ? '#312e81' : '#eef2ff')
                                  : (isDark ? '#0f172a' : '#ffffff'),
                                color: pinned
                                  ? (isDark ? '#c7d2fe' : '#4338ca')
                                  : textColor,
                                opacity: !pinned && excludedByFilters ? 0.5 : 1,
                              }}
                              title={
                                excludedByFilters && !pinned
                                  ? 'Esta comisión queda descartada por los filtros de exclusión. Fijarla la va a forzar igual.'
                                  : undefined
                              }
                            >
                              <span
                                className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: `1.5px solid ${pinned ? '#6366f1' : mutedColor}`,
                                  background: pinned ? '#6366f1' : 'transparent',
                                }}
                              >
                                {pinned && (
                                  <span
                                    className="rounded-full"
                                    style={{ width: 6, height: 6, background: '#fff' }}
                                  />
                                )}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block font-semibold leading-tight">
                                  Com. {c.codComision} · {c.dias || 'Sin horario'}
                                </span>
                                <span
                                  className="block leading-tight mt-0.5"
                                  style={{ color: pinned ? undefined : mutedColor }}
                                >
                                  {c.modalidad} · {c.sede}
                                  {c.observacion ? ` · ${c.observacion}` : ''}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {grouped.length === 0 && (
            <p
              className="text-xs text-center py-4 rounded-lg"
              style={{ color: mutedColor, background: bgSurface2 }}
            >
              Seleccioná materias en el panel lateral para poder fijar comisiones específicas.
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-5 py-3 shrink-0"
          style={{ borderTop: `1px solid ${borderColor}`, background: bgSurface2 }}
        >
          <button
            onClick={onClearAll}
            disabled={totalFilters === 0}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: totalFilters === 0 ? mutedColor : textColor,
              border: `1px solid ${borderColor}`,
              cursor: totalFilters === 0 ? 'not-allowed' : 'pointer',
              opacity: totalFilters === 0 ? 0.6 : 1,
            }}
          >
            Limpiar todo
          </button>
          <button
            onClick={onClose}
            className="ml-auto text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            style={{
              background: '#6366f1',
              color: '#ffffff',
              border: '1px solid #6366f1',
            }}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
