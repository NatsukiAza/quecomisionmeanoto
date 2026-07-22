'use client'

import WeeklyGrid from './WeeklyGrid'
import type { Combinacion } from '@/lib/types'
import { chipStyle } from '@/lib/colors'
import { comisionId } from '@/lib/algorithm'

interface Props {
  combination: Combinacion
  colorMap: Map<string, number>
  isDark: boolean
  index: number
  pinnedComisiones?: Set<string>
  onTogglePin?: (id: string) => void
}

export default function CombinationCard({
  combination,
  colorMap,
  isDark,
  index,
  pinnedComisiones,
  onTogglePin,
}: Props) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-lg"
      style={{
        background: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        boxShadow: isDark
          ? '0 1px 3px rgba(0,0,0,0.4)'
          : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3">
        <span
          className="text-sm font-semibold shrink-0"
          style={{ color: isDark ? '#94a3b8' : '#64748b' }}
        >
          Opción #{index + 1}
        </span>
        <div className="flex gap-1 flex-wrap justify-end ml-auto">
          {combination.map((c) => {
            const colorIdx = colorMap.get(c.codigoMateria) ?? 0
            return (
              <span
                key={comisionId(c)}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={chipStyle(colorIdx, isDark)}
                title={`${c.descripcion} — com. ${c.codComision} — ${c.dias || 'Sin horario'} — ${c.modalidad}`}
              >
                {c.descripcion}
              </span>
            )
          })}
        </div>
      </div>

      {/* Weekly grid (full width) */}
      <WeeklyGrid
        combination={combination}
        colorMap={colorMap}
        isDark={isDark}
        pinnedComisiones={pinnedComisiones}
        onTogglePin={onTogglePin}
      />

      {/* Comisiones sin horario fijo (p.ej. A Distancia) */}
      {combination.some((c) => !c.dias) && (
        <div className="flex flex-wrap gap-1.5">
          {combination
            .filter((c) => !c.dias)
            .map((c) => {
              const colorIdx = colorMap.get(c.codigoMateria) ?? 0
              return (
                <span
                  key={comisionId(c)}
                  className="inline-flex items-center px-2 py-1 rounded text-xs"
                  style={chipStyle(colorIdx, isDark)}
                  title={`${c.descripcion} — com. ${c.codComision} — ${c.modalidad} — ${c.sede}`}
                >
                  {c.descripcion}: Com. {c.codComision} · {c.modalidad} (sin horario)
                </span>
              )
            })}
        </div>
      )}
    </div>
  )
}
