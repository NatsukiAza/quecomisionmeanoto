'use client'

import { useState, useRef } from 'react'
import type { OfertaData } from '@/lib/types'

interface Props {
  onSelect: (data: OfertaData) => void
  isDark: boolean
}

export default function UniversitySelector({ onSelect, isDark }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.pdf')) {
      setError('Por favor subí un archivo PDF')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al procesar el PDF')
      }
      const data: OfertaData = await res.json()
      if (data.comisiones.length === 0) {
        throw new Error('No se encontraron comisiones en el PDF. Verificá que sea el formato correcto.')
      }
      onSelect(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
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
          <h1 className="text-2xl font-bold mb-1" style={{ color: textColor }}>
            ¿A qué comisión me anoto?
          </h1>
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
                Datos pre-cargados · 1er semestre 2026
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

        {/* PDF upload option */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="w-full rounded-xl p-5 text-left transition-all hover:scale-[1.01]"
            style={{
              background: isDark ? '#0f172a' : '#f8fafc',
              border: `2px dashed ${isDark ? '#334155' : '#cbd5e1'}`,
              cursor: loading ? 'wait' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#334155' : '#cbd5e1'
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📄</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: textColor }}>
                  Subir PDF de otra universidad
                </p>
                <p className="text-xs mt-0.5" style={{ color: mutedColor }}>
                  Oferta de comisiones en PDF · formato UNLaM compatible
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
