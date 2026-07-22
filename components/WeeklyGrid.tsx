'use client'

import { parseDias, comisionId } from '@/lib/algorithm'
import type { Comision } from '@/lib/types'
import { blockHex, textHex, lightenHex } from '@/lib/colors'

const ALL_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'] as const
const DAY_LABELS: Record<string, string> = {
  Lu: 'Lunes', Ma: 'Martes', Mi: 'Miércoles', Ju: 'Jueves', Vi: 'Viernes', Sa: 'Sábado',
}

const HOUR_START = 8
const HOUR_END = 23
const TOTAL_HOURS = HOUR_END - HOUR_START

const PX_PER_HOUR = 26   // height of 1 hour in pixels
const LABEL_W = 34       // left hour-label column width

const MODALIDAD_ABBR: Record<string, string> = {
  'Presencial': 'Presencial',
  'Semipresencial': 'Semipres.',
  'Sincrónica Teams': 'Sincrónica',
  'Virtual': 'Virtual',
  'Aula Virtual': 'Aula Virt.',
  'A Distancia': 'A Distancia',
  'Recursantes': 'Recursantes',
}

interface Props {
  /** One comision per selected materia */
  combination: Comision[]
  /** Maps codigoMateria → color slot index */
  colorMap: Map<string, number>
  isDark: boolean
  /** IDs de comisiones fijadas (comisionId). Si no se pasa, ninguna está fijada. */
  pinnedComisiones?: Set<string>
  /** Callback para fijar/desfijar al tocar el bloque de una comisión. */
  onTogglePin?: (id: string) => void
}

export default function WeeklyGrid({
  combination,
  colorMap,
  isDark,
  pinnedComisiones,
  onTogglePin,
}: Props) {
  // Always show the full week, Lunes to Sábado (empty days are shown blank).
  const activeDays: string[] = [...ALL_DAYS]

  const gridH = TOTAL_HOURS * PX_PER_HOUR

  const lineColor = isDark ? '#334155' : '#e2e8f0'
  const colBg = isDark ? '#0f172a55' : '#f8fafc99'
  const headColor = isDark ? '#94a3b8' : '#64748b'
  const hourColor = isDark ? '#475569' : '#94a3b8'

  return (
    <div className="w-full select-none">
      {/* Day headers */}
      <div className="flex" style={{ paddingLeft: LABEL_W }}>
        {activeDays.map(day => (
          <div
            key={day}
            className="flex-1 text-center font-medium pb-1"
            style={{ color: headColor, fontSize: 11 }}
          >
            <span className="sm:hidden">{day}</span>
            <span className="hidden sm:inline">{DAY_LABELS[day]}</span>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="flex" style={{ height: gridH }}>
        {/* Hour labels */}
        <div className="relative shrink-0" style={{ width: LABEL_W }}>
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
            const hour = HOUR_START + i
            return (
              <span
                key={hour}
                className="absolute right-1.5"
                style={{ top: i * PX_PER_HOUR - 5, color: hourColor, fontSize: 9, lineHeight: 1 }}
              >
                {hour}
              </span>
            )
          })}
        </div>

        {/* Day columns */}
        {activeDays.map((day, di) => {
          const dayBlocks = combination.flatMap(comision =>
            parseDias(comision.dias)
              .filter(b => b.dia === day)
              .map(b => ({ comision, block: b }))
          )

          return (
            <div
              key={day}
              className="relative flex-1"
              style={{
                background: colBg,
                borderLeft: `1px solid ${lineColor}`,
                borderRight: di === activeDays.length - 1 ? `1px solid ${lineColor}` : undefined,
              }}
            >
              {/* Hour grid lines */}
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0"
                  style={{ top: i * PX_PER_HOUR, height: 1, background: lineColor }}
                />
              ))}

              {/* Comision blocks for this day */}
              {dayBlocks.map(({ comision, block }) => {
                const colorIdx = colorMap.get(comision.codigoMateria) ?? 0
                const hex = blockHex(colorIdx, isDark)
                const txt = textHex(colorIdx, isDark)
                const cornerBg = lightenHex(hex, isDark ? 0.4 : 0.55)
                const top = (block.inicio - HOUR_START) * PX_PER_HOUR
                const height = (block.fin - block.inicio) * PX_PER_HOUR
                const id = comisionId(comision)
                const pinned = pinnedComisiones?.has(id) ?? false
                const clickable = !!onTogglePin

                const title = pinned
                  ? `${comision.descripcion} — Com. ${comision.codComision} — ${comision.modalidad} — ${comision.sede}\nFijada · tocá para desfijar`
                  : clickable
                    ? `${comision.descripcion} — Com. ${comision.codComision} — ${comision.modalidad} — ${comision.sede}\nTocá para fijar esta comisión`
                    : `${comision.descripcion} — Com. ${comision.codComision} — ${comision.modalidad} — ${comision.sede}`

                return (
                  <div
                    key={`${id}-${day}`}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => onTogglePin!(id) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onTogglePin!(id)
                            }
                          }
                        : undefined
                    }
                    className="absolute rounded-md overflow-hidden p-1 sm:p-1.5 flex flex-col gap-0.5 sm:gap-1 transition-shadow"
                    style={{
                      left: 3,
                      right: 3,
                      top: top + 1,
                      height: height - 2,
                      background: hex,
                      border: pinned ? `2px solid ${txt}` : `1px solid ${hex}`,
                      color: txt,
                      cursor: clickable ? 'pointer' : 'default',
                      boxShadow: pinned
                        ? (isDark
                            ? '0 0 0 1px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.35)'
                            : '0 0 0 1px rgba(0,0,0,0.05), 0 2px 6px rgba(99,102,241,0.25)')
                        : undefined,
                    }}
                    title={title}
                  >
                    {/* Mobile: sin nombre — se identifica por color + chips del header */}
                    <div className="sm:hidden flex flex-col gap-0.5 min-h-0 overflow-hidden">
                      <p className="font-semibold leading-tight truncate" style={{ fontSize: 9 }}>
                        Com. {comision.codComision} · {String(block.inicio).padStart(2, '0')}–{String(block.fin).padStart(2, '0')}h
                      </p>
                      <div className="flex items-center gap-0.5 min-w-0">
                        <div
                          className="rounded px-0.5 py-px font-semibold truncate"
                          style={{ background: cornerBg, color: txt, fontSize: 7, lineHeight: 1.1 }}
                        >
                          {MODALIDAD_ABBR[comision.modalidad] ?? comision.modalidad}
                        </div>
                        {pinned && (
                          <span
                            className="inline-flex items-center justify-center rounded shrink-0"
                            style={{ background: txt, color: hex, width: 12, height: 12 }}
                            aria-label="Fijada"
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Desktop: layout completo con nombre */}
                    <div className="hidden sm:flex flex-col gap-1 min-h-0 overflow-hidden">
                      <div>
                        <p className="font-semibold leading-tight" style={{ fontSize: 10 }}>
                          {comision.descripcion}
                        </p>
                        <p className="leading-tight mt-0.5" style={{ fontSize: 8, opacity: 0.75 }}>
                          Com. {comision.codComision} · {String(block.inicio).padStart(2, '0')}–{String(block.fin).padStart(2, '0')}h
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <div
                          className="rounded px-1 py-0.5 font-semibold"
                          style={{ background: cornerBg, color: txt, fontSize: 8, lineHeight: 1.1 }}
                        >
                          {MODALIDAD_ABBR[comision.modalidad] ?? comision.modalidad}
                        </div>
                        {pinned && (
                          <div
                            className="rounded px-1 py-0.5 font-bold tracking-wider"
                            style={{
                              background: txt,
                              color: hex,
                              fontSize: 8,
                              lineHeight: 1.1,
                              letterSpacing: '0.05em',
                            }}
                          >
                            FIJADA
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
