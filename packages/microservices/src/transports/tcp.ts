import type { TCPSocketListener } from 'bun'
import type {
  MicroserviceMessage,
  MicroserviceResponse,
  Transport,
} from '../types'

/** Options accepted by {@link tcpTransport}. */
export interface TcpTransportOptions {
  /**
   * The hostname to bind (server) or connect to (client).
   * Defaults to `'127.0.0.1'`.
   */
  host?: string
  /** The TCP port to listen on / connect to. */
  port: number
}

/**
 * Length-prefixed TCP framing helpers.
 *
 * Wire format: `[4-byte big-endian length][JSON payload]`
 */
function encode(obj: unknown): Buffer {
  const json = JSON.stringify(obj)
  const body = Buffer.from(json, 'utf8')
  const header = Buffer.allocUnsafe(4)
  header.writeUInt32BE(body.length, 0)
  return Buffer.concat([header, body])
}

function tryDecode(buf: Buffer): { msg: unknown; remaining: Buffer } | null {
  if (buf.length < 4) return null
  const len = buf.readUInt32BE(0)
  if (buf.length < 4 + len) return null
  const body = buf.subarray(4, 4 + len)
  const remaining = buf.subarray(4 + len)
  const msg = JSON.parse(body.toString('utf8')) as unknown
  return { msg, remaining }
}

type InboundHandler = (
  msg: MicroserviceMessage,
) => Promise<MicroserviceResponse | undefined>

type PendingReply = {
  resolve: (r: MicroserviceResponse) => void
  reject: (e: Error) => void
}

/**
 * TCP transport implementation using `Bun.listen` / `Bun.connect`.
 *
 * Messages are framed with a 4-byte big-endian length prefix followed by a
 * JSON body.  Request/reply is correlated via `correlationId`.
 *
 * @example
 * const transport = tcpTransport({ port: 3001 })
 * await transport.listen(async (msg) => ({ data: { ok: true } }))
 * // later
 * const res = await transport.send('ping', {})
 * await transport.close()
 */
export class TcpTransport implements Transport {
  private readonly host: string
  private readonly port: number
  private server: TCPSocketListener | null = null
  private readonly pendingReplies = new Map<string, PendingReply>()

  constructor(opts: TcpTransportOptions) {
    this.host = opts.host ?? '127.0.0.1'
    this.port = opts.port
  }

  async listen(handler: InboundHandler): Promise<void> {
    this.server = Bun.listen<{ buf: Buffer }>({
      hostname: this.host,
      port: this.port,
      socket: {
        open(socket) {
          socket.data = { buf: Buffer.alloc(0) }
        },
        data(socket, chunk) {
          socket.data.buf = Buffer.concat([socket.data.buf, Buffer.from(chunk)])
          let parsed = tryDecode(socket.data.buf)
          while (parsed) {
            socket.data.buf = parsed.remaining
            const inbound = parsed.msg as MicroserviceMessage
            handler(inbound)
              .then((response) => {
                if (response !== undefined && inbound.correlationId) {
                  const replyEnvelope = {
                    correlationId: inbound.correlationId,
                    ...response,
                  }
                  socket.write(encode(replyEnvelope))
                }
              })
              .catch(() => {
                if (inbound.correlationId) {
                  const errReply = {
                    correlationId: inbound.correlationId,
                    error: { message: 'Internal server error', status: 500 },
                  }
                  socket.write(encode(errReply))
                }
              })
            parsed = tryDecode(socket.data.buf)
          }
        },
        error(_socket, err) {
          console.error('[TcpTransport] socket error:', err)
        },
        close() {},
      },
    })
  }

  async close(): Promise<void> {
    if (this.server) {
      this.server.stop(true)
      this.server = null
    }
    for (const { reject } of this.pendingReplies.values()) {
      reject(new Error('Transport closed'))
    }
    this.pendingReplies.clear()
  }

  async send<T = unknown>(
    pattern: string,
    data: unknown,
  ): Promise<MicroserviceResponse<T>> {
    const correlationId = crypto.randomUUID()
    const msg: MicroserviceMessage = { pattern, data, correlationId }
    const pendingReplies = this.pendingReplies

    return new Promise<MicroserviceResponse<T>>((resolve, reject) => {
      let settled = false

      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        pendingReplies.delete(correlationId)
        fn()
      }

      pendingReplies.set(correlationId, {
        resolve: (r) => settle(() => resolve(r as MicroserviceResponse<T>)),
        reject: (e) => settle(() => reject(e)),
      })

      Bun.connect<{ buf: Buffer }>({
        hostname: this.host,
        port: this.port,
        socket: {
          open(socket) {
            socket.data = { buf: Buffer.alloc(0) }
            socket.write(encode(msg))
          },
          data(socket, chunk) {
            socket.data.buf = Buffer.concat([
              socket.data.buf,
              Buffer.from(chunk),
            ])
            let parsed = tryDecode(socket.data.buf)
            while (parsed) {
              socket.data.buf = parsed.remaining
              const response = parsed.msg as Record<string, unknown>
              if (response.correlationId === correlationId) {
                // Resolve (and mark settled) BEFORE calling socket.end(),
                // because socket.end() triggers the close callback synchronously
                // in Bun, which would otherwise fire the reject path.
                const pending = pendingReplies.get(correlationId)
                if (pending) {
                  pending.resolve(response as MicroserviceResponse<T>)
                }
                socket.end()
              }
              parsed = tryDecode(socket.data.buf)
            }
          },
          error(_socket, err) {
            const pending = pendingReplies.get(correlationId)
            if (pending) {
              pending.reject(err)
            }
          },
          close() {
            const pending = pendingReplies.get(correlationId)
            if (pending) {
              pending.reject(new Error('Connection closed before reply'))
            }
          },
        },
      }).catch((e) => settle(() => reject(e as Error)))
    })
  }

  async emit(pattern: string, data: unknown): Promise<void> {
    const msg: MicroserviceMessage = { pattern, data }
    await new Promise<void>((resolve, reject) => {
      Bun.connect<{ buf: Buffer }>({
        hostname: this.host,
        port: this.port,
        socket: {
          open(socket) {
            socket.data = { buf: Buffer.alloc(0) }
            socket.write(encode(msg))
            socket.end()
          },
          data() {},
          error(_socket, err) {
            reject(err)
          },
          close() {
            resolve()
          },
        },
      }).catch(reject)
    })
  }
}

/**
 * Create a TCP transport instance.
 *
 * @param opts - {@link TcpTransportOptions}
 * @returns A new {@link TcpTransport}.
 *
 * @example
 * const transport = tcpTransport({ port: 3001 })
 * MicroserviceModule.forRoot({ transport })
 */
export function tcpTransport(opts: TcpTransportOptions): TcpTransport {
  return new TcpTransport(opts)
}
