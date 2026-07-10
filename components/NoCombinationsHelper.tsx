'use client'

import { blockHex, textHex, lightenHex } from '@/lib/colors'

interface MateriaInfo {
  codigo: string
  nombre: string
  comisionCount: number
}

interface Props {
  isDark: boolean
  textColor: string
  mutedColor: string
  colorMap: Map<string, number>
  materias: Map<string, MateriaInfo>
  emptyMaterias: string[]
  conflictingPairs: Array<[string, string]>
  /** Fallback: si no hay pares/vacías pero tampoco combinaciones, mostrar todas. */
  allSelected: string[]
  onRemove: (codigo: string) => void
}

export default function NoCombinationsHelper({
  isDark,
  textColor,
  mutedColor,
  colorMap,
  materias,
  emptyMaterias,
  conflictingPairs,
  allSelected,
  onRemove,
}: Props) {
  const hasEmpty = emptyMaterias.length > 0
  const hasPairs = conflictingPairs.length > 0
  const showFallback = !hasEmpty && !hasPairs && allSelected.length > 0

  return (
    <div className="flex flex-col items-center gap-5 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">🚫</span>
        <p className="font-semibold" style={{ color: textColor }}>
          Sin combinaciones posibles
        </p>
        <p className="text-sm max-w-sm" style={{ color: mutedColor }}>
          No hay forma de cursar todas estas materias sin conflictos. Tocá una
          para quitarla de la selección o ajustá los filtros.
        </p>
      </div>

      {hasEmpty && (
        <section className="w-full max-w-2xl flex flex-col gap-2">
          <h4
            className="text-xs font-semibold uppercase tracking-wide text-center"
            style={{ color: mutedColor }}
          >
            Sin comisiones tras los filtros
          </h4>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {emptyMaterias.map(cod => {
              const info = materias.get(cod)
              if (!info) return null
              return (
                <MateriaBlock
                  key={cod}
                  codigo={cod}
                  nombre={info.nombre}
                  subtitle="0 comisiones disponibles"
                  colorIdx={colorMap.get(cod) ?? 0}
                  isDark={isDark}
                  onClick={() => onRemove(cod)}
                />
              )
            })}
          </div>
        </section>
      )}

      {hasPairs && (
        <section className="w-full max-w-2xl flex flex-col gap-2">
          <h4
            className="text-xs font-semibold uppercase tracking-wide text-center"
            style={{ color: mutedColor }}
          >
            Pares que no pueden combinarse
          </h4>
          <div className="flex flex-col gap-2 items-center">
            {conflictingPairs.map(([a, b], i) => {
              const infoA = materias.get(a)
              const infoB = materias.get(b)
              if (!infoA || !infoB) return null
              return (
                <div
                  key={`${a}|${b}|${i}`}
                  className="flex items-center gap-2 flex-wrap justify-center"
                >
                  <MateriaBlock
                    codigo={a}
                    nombre={infoA.nombre}
                    subtitle={`${infoA.comisionCount} com.`}
                    colorIdx={colorMap.get(a) ?? 0}
                    isDark={isDark}
                    onClick={() => onRemove(a)}
                  />
                  <ConflictIcon color={mutedColor} />
                  <MateriaBlock
                    codigo={b}
                    nombre={infoB.nombre}
                    subtitle={`${infoB.comisionCount} com.`}
                    colorIdx={colorMap.get(b) ?? 0}
                    isDark={isDark}
                    onClick={() => onRemove(b)}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {showFallback && (
        <section className="w-full max-w-2xl flex flex-col gap-2">
          <h4
            className="text-xs font-semibold uppercase tracking-wide text-center"
            style={{ color: mutedColor }}
          >
            Tocá una materia para quitarla
          </h4>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {allSelected.map(cod => {
              const info = materias.get(cod)
              if (!info) return null
              return (
                <MateriaBlock
                  key={cod}
                  codigo={cod}
                  nombre={info.nombre}
                  subtitle={`${info.comisionCount} com.`}
                  colorIdx={colorMap.get(cod) ?? 0}
                  isDark={isDark}
                  onClick={() => onRemove(cod)}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function MateriaBlock({
  nombre,
  subtitle,
  colorIdx,
  isDark,
  onClick,
}: {
  codigo: string
  nombre: string
  subtitle: string
  colorIdx: number
  isDark: boolean
  onClick: () => void
}) {
  const hex = blockHex(colorIdx, isDark)
  const txt = textHex(colorIdx, isDark)
  const cornerBg = lightenHex(hex, isDark ? 0.4 : 0.55)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-md p-2 pr-8 text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{
        background: hex,
        color: txt,
        border: `1px solid ${hex}`,
        minWidth: 160,
        maxWidth: 240,
      }}
      title={`Quitar ${nombre}`}
      aria-label={`Quitar ${nombre}`}
    >
      <p className="font-semibold leading-tight" style={{ fontSize: 11 }}>
        {nombre}
      </p>
      <p
        className="leading-tight mt-0.5 inline-block rounded px-1 py-0.5 font-semibold"
        style={{ background: cornerBg, color: txt, fontSize: 8, lineHeight: 1.1 }}
      >
        {subtitle}
      </p>
      <span
        className="absolute top-1 right-1 flex items-center justify-center rounded-full transition-opacity opacity-70 group-hover:opacity-100"
        style={{
          width: 16,
          height: 16,
          background: cornerBg,
          color: txt,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2 2L10 10M10 2L2 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  )
}

function ConflictIcon({ color }: { color: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{
        width: 24,
        height: 24,
        border: `1.5px solid ${color}`,
        color,
      }}
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 2L10 10M10 2L2 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
