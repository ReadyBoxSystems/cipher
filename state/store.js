// Module-singleton state + event emitter.
//
// Per Phase 1 D-05 (locked): plain object backing, plain event emitter, no library.
// Screens subscribe to keys they care about via on(key, fn) and unsubscribe in their cleanup
// function (router.js holds currentCleanup).

const _state = {
  user:          null,    // Supabase auth user (or null if signed out)
  profile:       null,    // profiles row for the current user
  conversations: [],      // array of conversation rows
  messages:      {},      // { [convId]: [msgRow, ...] }
  contacts:      {},      // { [convId]: profileRow }  the OTHER member of the conversation
}

/** @type {Record<string, Array<(data: any) => void>>} */
const _listeners = {}

/** Read a state key. Does NOT subscribe — use on() for that. */
export function get(key) {
  return _state[key]
}

/** Write a state key and emit the change to listeners on that key. */
export function set(key, value) {
  _state[key] = value
  emit(key, value)
}

/**
 * Subscribe to changes on `event` (typically a state key, but any string works).
 * Returns an unsubscribe function.
 */
export function on(event, fn) {
  if (!_listeners[event]) _listeners[event] = []
  _listeners[event].push(fn)
  return () => off(event, fn)
}

/** Remove a specific listener for `event`. */
export function off(event, fn) {
  _listeners[event] = (_listeners[event] || []).filter(f => f !== fn)
}

/** Fire all listeners for `event` with `data`. Listener errors are swallowed so one bad listener cannot break others. */
export function emit(event, data) {
  const fns = _listeners[event] || []
  for (const fn of fns) {
    try { fn(data) } catch (_e) { /* listener error — ignored */ }
  }
}
