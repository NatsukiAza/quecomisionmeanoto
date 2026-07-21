'use client'

import { useState } from 'react'
import type { OfertaData } from '@/lib/types'

interface Props {
  onSelect: (data: OfertaData) => void
  isDark: boolean
}

export default function UniversitySelector({ onSelect, isDark }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bgOverlay = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)'
  const bgCard = isDark ? '#1e293b' : '#ffffff'
  const borderColor = isDark ? '#334155' : '#e2e8f0'
  const textColor = isDark ? '#f1f5f9' : '#0f172a'
  const mutedColor = isDark ? '#94a3b8' : '#64748b'

  async function loadUnlam() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/unlam-data')
      if (!res.ok) throw new Error('No se pudo cargar la oferta de UNLaM')
      const data: OfertaData = await res.json()
      onSelect(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: bgOverlay, backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 flex flex-col gap-6"
        style={{
          background: bgCard,
          border: `1px solid ${borderColor}`,
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold" style={{ color: textColor }}>
              ¿A qué comisión me anoto?
            </h1>
            <span className="text-sm" style={{ color: mutedColor }}>
              Santino Azarola
            </span>
            <a
              href="https://www.linkedin.com/in/santino-azarola/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn de Santino Azarola"
              className="inline-flex items-center transition-opacity hover:opacity-80"
              style={{ color: mutedColor }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
          <p className="text-sm" style={{ color: mutedColor }}>
            Elegí tu universidad para ver las comisiones disponibles
          </p>
        </div>

        {/* UNLaM option */}
        <button
          onClick={loadUnlam}
          disabled={loading}
          className="w-full rounded-xl p-5 text-left transition-all hover:scale-[1.01]"
          style={{
            background: isDark ? '#0f172a' : '#f8fafc',
            border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            cursor: loading ? 'wait' : 'pointer',
          }}
          onMouseEnter={e => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#334155' : '#e2e8f0'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎓</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: textColor }}>
                UNLaM — Ingeniería Informática
              </p>
              <p className="text-xs mt-0.5" style={{ color: mutedColor }}>
                Datos pre-cargados · 2do cuatrimestre 2026
              </p>
            </div>
            {loading && (
              <svg className="ml-auto animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={mutedColor} strokeWidth="2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke={textColor} strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: borderColor }} />
          <span className="text-xs" style={{ color: mutedColor }}>o</span>
          <div className="flex-1 h-px" style={{ background: borderColor }} />
        </div>

        {/* PDF upload option — próximamente */}
        <div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="w-full rounded-xl p-5 text-left opacity-50 cursor-not-allowed"
            style={{
              background: isDark ? '#0f172a' : '#f8fafc',
              border: `2px dashed ${isDark ? '#334155' : '#cbd5e1'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📄</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: textColor }}>
                  Subir PDF de otra universidad
                </p>
                <p className="text-xs mt-0.5" style={{ color: mutedColor }}>
                  Próximamente
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-sm text-center rounded-lg px-4 py-2"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
