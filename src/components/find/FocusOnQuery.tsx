'use client'

import { useEffect } from 'react'

/**
 * Moves keyboard focus to `targetId` whenever `query` changes — including the
 * first render — but only for a page that was asked for by a search.
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
 * field and the 12-stop path came back (ODI-99 gate, finding 4). The submitted
 * query is the right key: it moves exactly once per search and does not move
 * while the visitor is only typing, so unrelated re-renders stay quiet.
 *
 * The `#results` guard is what keeps that from being a trap. Every route that
 * *asks* for this region carries the hash — both search forms and the chooser's
 * own option links push `/find?…#results` — while a bare shared or bookmarked
 * chooser URL does not. Focusing on a cold visit would put the keyboard on a
 * heading roughly a thousand pixels below an unscrolled viewport, so what the
 * visitor sees and what the screen reader announces would disagree. Those
 * visits keep the browser's normal initial focus instead (ODI-99 gate,
 * direct-load focus judgment).
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

    target.focus({ preventScroll: true })

    /*
      The router does its own `#results` fragment handling a beat after
      hydration and pulls focus back to the body. Whether that lands before or
      after this effect is a coin flip — measured about 14ms after, but it
      tracks hydration timing, so on a slow connection it can fall either side.
      Losing the race meant the heading was silently never focused, which is the
      12-stop tab path again.

      So re-assert instead of racing it. Only against the body: if any other
      element holds focus, a real person has moved on and this stops for good.
      Because the reclaim is skipped while the heading already holds focus, this
      calls focus() twice at most — no repeated screen-reader announcements.
    */
    let frame = 0
    const deadline = performance.now() + 1000
    const reclaim = () => {
      if (document.activeElement === document.body) target.focus({ preventScroll: true })
      else if (document.activeElement !== target) return
      if (performance.now() < deadline) frame = requestAnimationFrame(reclaim)
    }
    frame = requestAnimationFrame(reclaim)
    return () => cancelAnimationFrame(frame)
  }, [targetId, query])

  return null
}
