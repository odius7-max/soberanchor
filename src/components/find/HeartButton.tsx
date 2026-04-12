'use client'

import { useState, useTransition } from 'react'
import { useAuth } from '@/context/AuthContext'
import { saveListing, unsaveListing } from '@/app/find/actions'
import SaveModal from './SaveModal'

interface Props {
  meetingId?: string
  facilityId?: string
  initialSavedId?: string | null
  size?: number
  className?: string
}

export default function HeartButton({
  meetingId,
  facilityId,
  initialSavedId = null,
  size = 20,
}: Props) {
  const { user, openAuthPrompt } = useAuth()
  const [savedId, setSavedId] = useState<string | null>(initialSavedId)
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isSaved = !!savedId

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      openAuthPrompt({
        title: 'Save your favorites',
        body: 'Create a free account to save listings and keep them in an easy, accessible place to reference anytime.',
      })
      return
    }
    if (isSaved) {
      startTransition(async () => {
        await unsaveListing(savedId!)
        setSavedId(null)
      })
    } else {
      setShowModal(true)
    }
  }

  async function handleSave(listType: 'favorite' | 'watchlist', note: string) {
    setShowModal(false)
    startTransition(async () => {
      const result = await saveListing({
        meetingId,
        facilityId,
        listType,
        note: note || undefined,
      })
      setSavedId(result.id)
    })
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        aria-label={isSaved ? 'Remove from saved' : 'Save to favorites'}
        title={isSaved ? 'Saved — click to remove' : 'Save to favorites'}
        style={{
          background: 'none',
          border: 'none',
          cursor: isPending ? 'wait' : 'pointer',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isSaved ? '#E74C3C' : 'rgba(0,0,0,0.22)',
          transition: 'color 0.15s, transform 0.1s',
          transform: isPending ? 'scale(0.85)' : 'scale(1)',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!isSaved && !isPending) e.currentTarget.style.color = 'rgba(231,76,60,0.55)'
          if (isSaved && !isPending) e.currentTarget.style.color = '#c0392b'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = isSaved ? '#E74C3C' : 'rgba(0,0,0,0.22)'
        }}
      >
        {isSaved ? (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
      </button>

      {showModal && (
        <SaveModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
