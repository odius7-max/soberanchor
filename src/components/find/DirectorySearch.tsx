'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Directory search input. Submits to `/find?q=<term>#results`; the server
 * component on /find runs a keyword ILIKE match. No AI wiring here — that
 * lives in the site-wide Ask-anything modal (Nav).
 */
export default function DirectorySearch({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = q.trim()
    if (trimmed) router.push(`/find?q=${encodeURIComponent(trimmed)}#results`)
    else router.push('/find')
  }

  return (
    <form onSubmit={submit} role="search" className="w-full max-w-[720px]">
      <label htmlFor="directory-search" className="sr-only">
        Search the directory
      </label>
      <div className="flex items-stretch gap-0 bg-white border border-[var(--border)] rounded-xl overflow-hidden focus-within:border-teal focus-within:shadow-[0_0_0_3px_var(--teal-10)] transition-shadow">
        <div className="flex items-center pl-4 text-[var(--mid)]" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.75" />
            <path d="M13 13L17.5 17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </div>
        <input
          id="directory-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search treatment, sober living, therapists…"
          className="flex-1 min-w-0 px-3 py-3 bg-transparent outline-none text-[15px] text-dark placeholder:text-[var(--mid)]"
          autoComplete="off"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-[var(--teal)] text-white font-semibold text-sm hover:opacity-90 transition-opacity min-h-[44px] whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)]"
        >
          Search
        </button>
      </div>
    </form>
  )
}
