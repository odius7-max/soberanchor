'use client'

import { useEffect } from 'react'

/**
 * Moves keyboard focus to `targetId` once, after the element renders.
 *
 * /find is a server-rendered page, so a submitted search leaves focus wherever
 * the browser puts it — at the top of the document after a fresh load. For the
 * disambiguation chooser that meant tabbing through the nav and all six
 * category tiles before reaching a choice (12 stops, per the ODI-93 gate).
 * Focusing the heading rather than the first option keeps the announcement
 * ("Which Springfield?") ahead of the choices and leaves the options as plain
 * links.
 *
 * `preventScroll` because the `#results` hash already positions the page;
 * focusing must not fight it.
 */
export default function FocusOnMount({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }, [targetId])

  return null
}
