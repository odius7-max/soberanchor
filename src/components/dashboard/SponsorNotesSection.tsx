'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Note {
  id: string
  note_text: string
  created_at: string
}

interface Props {
  initialNotes: Note[]
}

export default function SponsorNotesSection({ initialNotes }: Props) {
  const [notes,           setNotes]           = useState<Note[]>(initialNotes)
  const [menuOpenId,      setMenuOpenId]      = useState<string | null>(null)
  const [editingId,       setEditingId]       = useState<string | null>(null)
  const [editText,        setEditText]        = useState('')
  const [savingId,        setSavingId]        = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId,      setDeletingId]      = useState<string | null>(null)
  const [toast,           setToast]           = useState<string | null>(null)

  // Close kebab menu on any outside click
  useEffect(() => {
    if (!menuOpenId) return
    function close() { setMenuOpenId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpenId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave(noteId: string) {
    if (!editText.trim() || savingId) return
    setSavingId(noteId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('sponsor_notes')
        .update({ note_text: editText.trim() })
        .eq('id', noteId)
      if (error) throw new Error(error.message)
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, note_text: editText.trim() } : n))
      setEditingId(null)
      showToast('Note updated')
    } catch {
      showToast('Failed to update note')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(noteId: string) {
    if (deletingId) return
    setDeletingId(noteId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('sponsor_notes')
        .delete()
        .eq('id', noteId)
      if (error) throw new Error(error.message)
      setNotes(prev => prev.filter(n => n.id !== noteId))
      setConfirmDeleteId(null)
      showToast('Note deleted')
    } catch {
      showToast('Failed to delete note')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* Toast — fixed so it's never clipped by overflow */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          background: 'var(--navy)', color: '#fff',
          borderRadius: 8, padding: '8px 16px',
          fontSize: 12, fontWeight: 600, pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      <details style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
        <summary style={{
          cursor: 'pointer', listStyle: 'none', WebkitAppearance: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
            🔒 Sponsor Notes
          </h2>
          <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 500, flexShrink: 0 }}>
            {notes.length === 0
              ? 'No notes yet'
              : `${notes.length} note${notes.length !== 1 ? 's' : ''}`} · tap to expand
          </span>
        </summary>

        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--mid)', margin: '0 0 14px', fontStyle: 'italic' }}>
            Private — only you can see these notes. Your sponsee never sees them.
          </p>

          {notes.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--mid)', textAlign: 'center', padding: '16px 0' }}>
              No notes yet. Add notes from the sponsee card on your dashboard.
            </div>
          ) : notes.map((note, i) => (
            <div
              key={note.id}
              style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none', position: 'relative' }}
            >
              {/* Timestamp row + kebab */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', letterSpacing: '0.3px' }}>
                  {new Date(note.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}{' at '}
                  {new Date(note.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit',
                  })}
                </div>

                {/* Kebab menu */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpenId(prev => prev === note.id ? null : note.id) }}
                    aria-label="Note options"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '2px 7px', fontSize: 17, lineHeight: 1,
                      color: 'var(--mid)', borderRadius: 4,
                    }}
                  >
                    ⋮
                  </button>

                  {menuOpenId === note.id && (
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', marginTop: 4,
                      background: '#fff', border: '1px solid var(--border)',
                      borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      zIndex: 50, minWidth: 100, overflow: 'hidden',
                    }}>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingId(note.id)
                          setEditText(note.note_text)
                          setConfirmDeleteId(null)
                          setMenuOpenId(null)
                        }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '9px 14px', fontSize: 13, color: 'var(--dark)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setConfirmDeleteId(note.id)
                          setEditingId(null)
                          setMenuOpenId(null)
                        }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '9px 14px', fontSize: 13, color: '#c0392b',
                          background: 'none', border: 'none', borderTop: '1px solid var(--border)',
                          cursor: 'pointer', fontFamily: 'var(--font-body)',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit mode */}
              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditingId(null) }}
                    rows={3}
                    autoFocus
                    style={{
                      width: '100%', borderRadius: 8, border: '1.5px solid var(--teal)',
                      padding: '9px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
                      resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                      color: 'var(--dark)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        background: 'none', border: '1px solid var(--border)', borderRadius: 7,
                        padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                        color: 'var(--mid)', fontFamily: 'var(--font-body)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(note.id)}
                      disabled={savingId === note.id || !editText.trim()}
                      style={{
                        background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 7,
                        padding: '6px 18px', fontSize: 12, fontWeight: 600,
                        cursor: savingId === note.id || !editText.trim() ? 'not-allowed' : 'pointer',
                        opacity: savingId === note.id || !editText.trim() ? 0.6 : 1,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {savingId === note.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : confirmDeleteId === note.id ? (
                /* Delete confirmation */
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8,
                  background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.15)',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--dark)', flex: 1 }}>Delete this note?</span>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                      padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                      color: 'var(--mid)', fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={!!deletingId}
                    style={{
                      background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      cursor: deletingId ? 'not-allowed' : 'pointer',
                      opacity: deletingId ? 0.6 : 1,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {deletingId === note.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              ) : (
                /* Normal text view */
                <div style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.65 }}>
                  {note.note_text}
                </div>
              )}
            </div>
          ))}
        </div>
      </details>
    </>
  )
}
