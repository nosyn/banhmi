import type { RouteCtx } from '@banhmi/common'
import { signValue, verifyValue } from '@banhmi/cookies'
import { MemorySessionStore } from './stores/memory'
import type {
  SessionData,
  SessionOptions,
  SessionRef,
  SessionStore,
} from './types'

/** @internal State key for the live SessionRef. */
export const SESSION_STATE_KEY = 'banhmi:session:ref'
/** @internal State key for the pending Set-Cookie value. */
export const SESSION_COOKIE_KEY = 'banhmi:session:cookie'

/**
 * Create a default cookie name from session options.
 *
 * @internal
 */
function cookieName(opts: SessionOptions): string {
  return opts.cookie?.name ?? 'banhmi.sid'
}

/**
 * Serialize a Set-Cookie header value for the session id.
 *
 * @internal
 */
function buildSetCookie(
  name: string,
  signedId: string,
  opts: SessionOptions,
  expired = false,
): string {
  const maxAge = expired ? 0 : (opts.cookie?.maxAge ?? 86400)
  const sameSite = opts.cookie?.sameSite ?? 'lax'
  const secure = opts.cookie?.secure ?? false
  const httpOnly = opts.cookie?.httpOnly !== false

  let cookie = `${name}=${signedId}; Max-Age=${maxAge}; SameSite=${sameSite}`
  if (httpOnly) cookie += '; HttpOnly'
  if (secure) cookie += '; Secure'
  cookie += '; Path=/'
  return cookie
}

/**
 * Parse a session id from the Cookie header, verify the HMAC signature,
 * and return the raw id string. Returns `null` if absent or invalid.
 *
 * @internal
 */
async function extractSessionId(
  ctx: RouteCtx,
  opts: SessionOptions,
): Promise<string | null> {
  const name = cookieName(opts)
  const header = ctx.headers.get('cookie') ?? ''

  // Simple cookie parsing (value may contain `=` signs inside base64url)
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=')
    if (eqIdx < 0) continue
    const key = part.slice(0, eqIdx).trim()
    const val = part.slice(eqIdx + 1).trim()
    if (key === name) {
      return verifyValue(val, opts.secret)
    }
  }
  return null
}

/**
 * Build a {@link SessionRef} live object backed by the given store and data.
 *
 * @internal
 */
function buildSessionRef(
  id: string,
  data: SessionData,
  store: SessionStore,
  onDirty: () => void,
  onDestroy: (newId: string | null) => void,
  onRegenerate: (newId: string) => void,
): SessionRef {
  let sessionId = id
  let dirty = false

  const ref: SessionRef = {
    get id(): string {
      return sessionId
    },
    get<T>(key: string): T | undefined {
      return data[key] as T | undefined
    },
    set(key: string, value: unknown): void {
      data[key] = value
      dirty = true
      onDirty()
    },
    async destroy(): Promise<void> {
      await store.destroy(sessionId)
      for (const key of Object.keys(data)) {
        delete data[key]
      }
      dirty = false
      onDestroy(null)
    },
    async regenerate(): Promise<void> {
      const oldId = sessionId
      await store.destroy(oldId)
      sessionId = crypto.randomUUID()
      dirty = true
      onRegenerate(sessionId)
    },
  }

  // Expose dirty flag via a hidden property for flush access
  Object.defineProperty(ref, '__dirty', {
    get: () => dirty,
    enumerable: false,
  })
  Object.defineProperty(ref, '__data', {
    get: () => data,
    enumerable: false,
  })

  return ref
}

type SessionInternalRef = SessionRef & {
  __dirty: boolean
  __data: SessionData
}

/**
 * Load/create a session for the current request and attach it to
 * `ctx.state[SESSION_STATE_KEY]`. Must be called before the handler runs.
 *
 * Returns a flush function to be called after the handler response is produced
 * so that dirty sessions can be persisted and Set-Cookie headers appended.
 *
 * @internal
 */
export async function initSession(
  ctx: RouteCtx,
  opts: SessionOptions,
): Promise<(response: Response) => Promise<Response>> {
  const store: SessionStore = opts.store ?? new MemorySessionStore()
  const name = cookieName(opts)
  const ttl = opts.cookie?.maxAge ?? 86400

  let existingId = await extractSessionId(ctx, opts)
  let data: SessionData = {}
  let isNew = false

  if (existingId) {
    const stored = await store.get(existingId)
    if (stored) {
      data = stored
    } else {
      // Session expired or unknown — create fresh
      existingId = null
    }
  }

  if (!existingId) {
    existingId = crypto.randomUUID()
    isNew = true
  }

  let sessionId = existingId
  let pendingCookie: string | null = null
  let destroyed = false

  const ref = buildSessionRef(
    sessionId,
    data,
    store,
    () => {},
    (newId) => {
      destroyed = newId === null
    },
    (newId) => {
      sessionId = newId
      pendingCookie = null // will be built on flush
    },
  )

  ctx.state[SESSION_STATE_KEY] = ref

  // Return the flush function
  return async (response: Response): Promise<Response> => {
    const internal = ref as SessionInternalRef

    if (destroyed) {
      // Session was destroyed: send an expiry cookie
      const signed = await signValue(sessionId, opts.secret)
      const cookie = buildSetCookie(name, signed, opts, true)
      const cloned = new Response(response.body, response)
      cloned.headers.append('set-cookie', cookie)
      return cloned
    }

    if (internal.__dirty || isNew) {
      // Persist to store
      await store.set(internal.id, internal.__data, ttl)
      // Set cookie (new session or id changed after regenerate)
      if (pendingCookie === null) {
        const signed = await signValue(internal.id, opts.secret)
        pendingCookie = buildSetCookie(name, signed, opts)
      }
      const cloned = new Response(response.body, response)
      cloned.headers.append('set-cookie', pendingCookie)
      return cloned
    }

    return response
  }
}

/**
 * Retrieve the live {@link SessionRef} for the current request.
 *
 * Must be called inside a handler that has the `@Session()` decorator
 * (or after {@link initSession} has been called).
 *
 * @param ctx - The route context.
 * @returns The session reference.
 *
 * @example
 * const session = getSession(ctx)
 * const count = session.get<number>('count') ?? 0
 * session.set('count', count + 1)
 */
export function getSession(ctx: RouteCtx): SessionRef {
  const ref = ctx.state[SESSION_STATE_KEY]
  if (!ref) {
    throw new Error(
      'No session found on this request. Did you apply @Session() to the handler?',
    )
  }
  return ref as SessionRef
}
