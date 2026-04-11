'use client'

import { useRouter } from 'next/navigation'

interface Props {
  fallback: string
  label: string
  className?: string
}

export default function BackButton({ fallback, label, className = 'text-teal text-sm font-medium hover:underline' }: Props) {
  const router = useRouter()

  function handleClick() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}
    >
      {label}
    </button>
  )
}
