import { MAX_MATERIAS } from './types'

export type ColorSlot = {
  lightHex: string
  darkHex: string
  lightTextHex: string
  darkTextHex: string
  label: string
}

export const MATERIA_COLORS: ColorSlot[] = [
  { lightHex: '#fecdd3', darkHex: '#881337', lightTextHex: '#881337', darkTextHex: '#fecdd3', label: 'Rosa'     },
  { lightHex: '#bae6fd', darkHex: '#0c4a6e', lightTextHex: '#0c4a6e', darkTextHex: '#bae6fd', label: 'Celeste'  },
  { lightHex: '#a7f3d0', darkHex: '#064e3b', lightTextHex: '#065f46', darkTextHex: '#a7f3d0', label: 'Verde'    },
  { lightHex: '#ddd6fe', darkHex: '#2e1065', lightTextHex: '#4c1d95', darkTextHex: '#ddd6fe', label: 'Violeta'  },
  { lightHex: '#fde68a', darkHex: '#451a03', lightTextHex: '#78350f', darkTextHex: '#fde68a', label: 'Amarillo' },
  { lightHex: '#fbcfe8', darkHex: '#500724', lightTextHex: '#831843', darkTextHex: '#fbcfe8', label: 'Rosa 2'   },
  { lightHex: '#99f6e4', darkHex: '#042f2e', lightTextHex: '#134e4a', darkTextHex: '#99f6e4', label: 'Teal'     },
  { lightHex: '#c7d2fe', darkHex: '#1e1b4b', lightTextHex: '#312e81', darkTextHex: '#c7d2fe', label: 'Indigo'   },
] as const satisfies ColorSlot[] & { length: typeof MAX_MATERIAS }

/** Returns CSS inline style for a color chip background + text */
export function chipStyle(colorIdx: number, isDark: boolean): React.CSSProperties {
  const c = MATERIA_COLORS[colorIdx] ?? MATERIA_COLORS[0]
  return {
    backgroundColor: isDark ? c.darkHex : c.lightHex,
    color: isDark ? c.darkTextHex : c.lightTextHex,
  }
}

/** Returns only the background hex for a given color slot */
export function blockHex(colorIdx: number, isDark: boolean): string {
  const c = MATERIA_COLORS[colorIdx] ?? MATERIA_COLORS[0]
  return isDark ? c.darkHex : c.lightHex
}

/** Returns the text hex for a given color slot */
export function textHex(colorIdx: number, isDark: boolean): string {
  const c = MATERIA_COLORS[colorIdx] ?? MATERIA_COLORS[0]
  return isDark ? c.darkTextHex : c.lightTextHex
}

/** Blends a hex color toward white by `amount` (0-1). Used for the lighter corner square. */
export function lightenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const nr = Math.round(r + (255 - r) * amount)
  const ng = Math.round(g + (255 - g) * amount)
  const nb = Math.round(b + (255 - b) * amount)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`
}
