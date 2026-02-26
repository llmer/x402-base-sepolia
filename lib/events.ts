/**
 * In-memory event bus for live request feed.
 *
 * Ephemeral — state lives only in this Node.js process. No persistence.
 * Module-level singletons are fine here: this is a single-server demo app.
 */

export interface RequestEvent {
  id: string
  ts: number
  type: 'probe' | 'paid' | 'failed'
  /** Payer address (paid only) */
  from?: string
  /** Settlement tx hash (paid only) */
  tx?: string
  /** Error reason (failed only) */
  error?: string
}

type Listener = (event: RequestEvent) => void

const listeners = new Set<Listener>()
const recent: RequestEvent[] = []
const MAX_RECENT = 50

/** Subscribe to new events. Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  // Replay recent events so new subscribers see history immediately
  recent.forEach(fn)
  return () => listeners.delete(fn)
}

/** Emit a new event to all subscribers and store it in the recent buffer. */
export function emit(event: RequestEvent): void {
  recent.push(event)
  if (recent.length > MAX_RECENT) recent.splice(0, recent.length - MAX_RECENT)
  listeners.forEach((fn) => fn(event))
}
