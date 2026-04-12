'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onSave: (listType: 'favorite' | 'watchlist', note: string) => void
  onClose: () => void
}

export default function SaveModal({ onSave, onClose }: Props) {
  const [listType, setListType] = useState<'favorite' | 'watchlist'>('favorite')
  const [note, setNote] = useState('')
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    setTimeout(() => inputRef.current?.focus(), 50)
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const LISTS = [
    { v: 'favorite' as const, emoji: '❤️', label: 'Favorites', desc: 'My go-to regulars' },
    { v: 'watchlist' as const, emoji: '🔖', label: 'Watchlist', desc: 'Maybe / backup' },
  ]

  const modal = (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, padding: '28px 24px',
        maxWidth: 360, width: '100%',
        boxShadow: '0 20px 60px rgba(0,51,102,0.2)',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 18, lineHeight: 1, padding: 4 }}
        >✕</button>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--navy)', marginBottom: 4, letterSpacing: '-0.4px' }}>Save listing</h3>
        <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 18, lineHeight: 1.5 }}>
          Choose a list to save this to.
        </p>

        {/* List type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {LISTS.map(({ v, emoji, label, desc }) => (
            <button
              key={v}
              onClick={() => setListType(v)}
              style={{
                flex: 1, padding: '12px 10px', borderRadius: 10,
                border: `2px solid ${listType === v ? 'var(--teal)' : 'var(--border)'}`,
                background: listType === v ? 'rgba(42,138,153,0.06)' : '#fff',
                cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{emoji} {label}</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 3 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Optional note */}
        <input
          ref={inputRef}
          type="text"
          placeholder='Add a note — "Tuesday group with Mike"'
          value={note}
          maxLength={120}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(listType, note) }}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
            border: '1.5px solid var(--border)', fontFamily: 'var(--font-body)',
            boxSizing: 'border-box', outline: 'none', marginBottom: 16,
            color: 'var(--dark)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onSave(listType, note)}
            style={{
              flex: 1, padding: '11px', borderRadius: 8,
              background: 'var(--teal)', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: 14,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '11px 18px', borderRadius: 8,
              background: '#fff', color: 'var(--mid)',
              border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 14,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}
