/**
 * Cancellation marker shared by the auth modal and AuthQueryOpener (R1 residual).
 *
 * The residual failure: cancelling claim auth closed the modal and pushed to
 * the listing, but PP-R2 saw a signed-out page whose URL still carried `next`
 * during the transition and dutifully "restored" the prompt — so the modal
 * reappeared on top of the destination. The guard against an already-open
 * modal couldn't help, because at that instant the modal had just closed.
 *
 * Cancellation therefore has to be one atomic act: close, mark the occurrence
 * cancelled, then navigate. This module is the marker the two components share.
 *
 * Module-level state is deliberate — it is per-tab, never persisted, and must
 * not survive a reload, because a fresh page load with a valid `next` SHOULD
 * restore the prompt. That is PP-R2's whole purpose.
 */

let cancelledContinuation: string | null = null

/** Record that this exact destination was just cancelled by the user. */
export function markAuthCancelled(continuation: string | null): void {
  cancelledContinuation = continuation
}

/**
 * True while the given destination is the one the user just cancelled.
 * Scoped to the exact continuation so cancelling a welcome intent never
 * suppresses a later claim intent.
 */
export function wasAuthCancelled(continuation: string | null): boolean {
  return !!continuation && cancelledContinuation === continuation
}

/**
 * Clear the marker. Called whenever the modal opens for any reason, so
 * cancel → Back → retry keeps working: the retry opens through the normal
 * `?auth=` path, which clears the marker on the way in.
 */
export function clearAuthCancelled(): void {
  cancelledContinuation = null
}
