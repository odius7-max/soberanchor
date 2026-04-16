'use client'

import { useState } from 'react'

interface Props {
  stepNumber: number
  onAdd: (task: { title: string; description: string | null; category: string; saveToLibrary: boolean }) => void
}

export default function CreateTaskForm({ stepNumber, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('reflection')
  const [saveToLibrary, setSaveToLibrary] = useState(true)

  function handleSubmit() {
    if (!title.trim()) return
    onAdd({
      title: title.trim(),
      description: description.trim() || null,
      category,
      saveToLibrary,
    })
    setTitle('')
    setDescription('')
    setCategory('reflection')
    setSaveToLibrary(true)
  }

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
          Title <span style={{ color: '#C0392B' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What should your sponsee do?"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSubmit() }}
          style={{
            width: '100%', fontSize: 14, fontWeight: 600, color: 'var(--navy)',
            padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
            background: '#fff', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
          Category
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{
            fontSize: 13, padding: '8px 12px', borderRadius: 8,
            border: '1.5px solid var(--border)', background: '#fff',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}
        >
          <option value="reading">📖 Reading</option>
          <option value="writing">✏️ Writing</option>
          <option value="reflection">💭 Reflection</option>
          <option value="action">✅ Action</option>
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
          Instructions for sponsee <span style={{ fontWeight: 400, color: 'var(--mid)' }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Explain what you want them to do, read, or reflect on..."
          rows={3}
          style={{
            width: '100%', fontSize: 13, color: 'var(--dark)',
            padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
            background: '#fff', fontFamily: 'var(--font-body)', outline: 'none',
            boxSizing: 'border-box', resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={e => setSaveToLibrary(e.target.checked)}
            style={{ accentColor: 'var(--teal)', width: 14, height: 14 }}
          />
          <span style={{ fontSize: 12, color: 'var(--mid)' }}>Save to My Library</span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          style={{
            fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 8,
            border: 'none',
            background: title.trim() ? 'var(--teal)' : '#ccc',
            color: '#fff',
            cursor: title.trim() ? 'pointer' : 'default',
            fontFamily: 'var(--font-body)',
          }}
        >
          Add to Step {stepNumber}
        </button>
      </div>
    </div>
  )
}
