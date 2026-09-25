'use client'

import { useEffect } from 'react'

/**
 * The heading is focused at most this many times for one submitted query: the
 * initial move, plus a single recovery if the router takes focus back.
 * Enforced by a counter, because a deadline alone is not a bound — a page that
 * keeps returning focus to the body keeps earning new focus calls out of a
 * time-limited loop (ODI-99 retest, R2).
 *
 * This bounds focus *transitions*, which is all the code can honestly claim. On
 * the ordinary path it is one call and one focusin per query (measured at 1x
 * and 8x CPU), and a screen reader announces a focused element once per such
 * transition — but no NVDA/JAWS/VoiceOver run has verified that here, so
 * nothing in this file should be read as certifying what is spoken.
 */
const MAX_FOCUS_CALLS = 2

/**
 * Moves keyboard focus to `targetId` whenever `query` changes — including the
 * first render — but only for a page that was asked for by a search, and only
 * while the visitor has not taken the field for themselves.
 *
 * /find is a server-rendered page, so a submitted search leaves focus wherever
 * the browser puts it — at the top of the document after a fresh load. For the
 * disambiguation chooser that meant tabbing through the nav and all six
 * category tiles before reaching a choice (12 stops, per the ODI-93 gate).
 * Focusing the heading rather than the first option keeps the announcement
 * ("Which Springfield?") ahead of the choices and leaves the options as plain
 * links.
 *
 * Keyed on the query rather than on mount alone: a chooser-to-chooser search —
 * submit "Springfield", then "san diego" — re-renders this component in place
 * instead of remounting it, so a mount-only effect left focus in the search
 * field and the 12-stop path came back (ODI-99 gate, finding 4).
 *
 * The `#results` guard is what keeps that from being a trap. Every route that
 * *asks* for this region carries the hash — both search forms and the chooser's
 * own option links push `/find?…#results` — while a bare shared or bookmarked
 * chooser URL does not. Focusing on a cold visit would put the keyboard on a
 * heading roughly a thousand pixels below an unscrolled viewport, so what the
 * visitor sees and what the screen reader announces would disagree. Those
 * visits keep the browser's normal initial focus instead.
 *
 * `preventScroll` because the `#results` hash already positions the page;
 * focusing must not fight it.
 */
export default function FocusOnQuery({
  targetId,
  query,
}: {
  targetId: string
  query: string
}) {
  useEffect(() => {
    if (window.location.hash !== '#results') return
    const target = document.getElementById(targetId)
    if (!target) return

    /*
      Somebody who carried on typing while the results were in flight owns the
      field and the caret; results arriving is not a reason to yank either away
      (ODI-99 retest, R1). Being focused in the input is not the test — pressing
      Enter leaves focus there too — so the test is whether the field is holding
      edits newer than its last submission. DirectorySearch is the authority on
      that and marks itself `data-user-edited`.
    */
    const active = document.activeElement
    if (active instanceof HTMLElement && active.dataset.userEdited === 'true') return

    let calls = 0
    let frame = 0
    let stopped = false

    const focusHeading = () => {
      calls += 1
      target.focus({ preventScroll: true })
    }

    const stop = () => {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', stop, true)
      document.removeEventListener('pointerdown', stop, true)
      document.removeEventListener('input', stop, true)
    }

    /*
      Any deliberate interaction from here ends the recovery permanently, rather
      than being re-evaluated each frame: once a person has typed, tabbed or
      clicked, nothing this component does later should move their focus.
    */
    document.addEventListener('keydown', stop, true)
    document.addEventListener('pointerdown', stop, true)
    document.addEventListener('input', stop, true)

    focusHeading()

    /*
      The router does its own `#results` fragment handling a beat after
      hydration and pulls focus back to the body. Whether that lands before or
      after this effect is a coin flip — measured about 14ms after, but it
      tracks hydration timing, so on a slow connection it can fall either side.
      Losing the race meant the heading was silently never focused, which is the
      12-stop tab path again. So re-assert rather than race it, but strictly:
      one recovery, from the body only, then done for this query.
    */
    const deadline = performance.now() + 1000
    const reclaim = () => {
      if (stopped) return
      if (calls >= MAX_FOCUS_CALLS) return stop()
      if (document.activeElement === document.body) focusHeading()
      else if (document.activeElement !== target) return stop()
      if (performance.now() >= deadline) return stop()
      frame = requestAnimationFrame(reclaim)
    }
    frame = requestAnimationFrame(reclaim)

    return stop
  }, [targetId, query])

  return null
}
