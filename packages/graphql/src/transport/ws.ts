/**
 * WebSocket transport for GraphQL subscriptions.
 *
 * Bridges Bun's native WebSocket server (`Bun.serve`) to the GraphQL
 * subscription executor via the `graphql-ws` protocol.
 *
 * @remarks
 * This is a lightweight adapter that uses `Bun.serve`'s built-in WS support.
 * For production use, consider pairing with `graphql-yoga`'s built-in
 * WS subscription support (`useServer` from `graphql-ws/lib/use/bun`).
 *
 * @example
 * const handler = createWsHandler(schema)
 * Bun.serve({
 *   fetch(req, server) {
 *     if (req.headers.get('upgrade') === 'websocket') {
 *       server.upgrade(req, { data: { handler } })
 *       return
 *     }
 *     return new Response('Not found', { status: 404 })
 *   },
 *   websocket: {
 *     open(ws) { ws.data.handler.handleOpen(ws) },
 *     message(ws, msg) { ws.data.handler.handleMessage(ws, msg) },
 *     close(ws) { ws.data.handler.handleClose(ws) },
 *   },
 * })
 */

import type { GraphQLSchema } from 'graphql'
import { execute, parse, subscribe } from 'graphql'

// TODO: Integrate graphql-ws protocol (Message type) for production use.
// Currently implements a minimal JSON-RPC-like protocol for testing.

/** @internal */
interface WsMessage {
  type: string
  id?: string
  payload?: {
    query?: string
    variables?: Record<string, unknown>
    operationName?: string
  }
}

/** @internal */
type WsServerSocket = {
  send: (data: string) => void
}

/**
 * A minimal WS handler that speaks a subset of the `graphql-ws` protocol.
 *
 * @internal
 */
export class BunGraphQLWsHandler {
  private subscriptions = new Map<
    string,
    { return?: () => Promise<IteratorResult<unknown>> }
  >()

  constructor(private schema: GraphQLSchema) {}

  /**
   * Handle a new WebSocket connection.
   *
   * @param ws - The Bun WebSocket server-side socket.
   */
  handleOpen(ws: WsServerSocket): void {
    ws.send(JSON.stringify({ type: 'connection_ack' }))
  }

  /**
   * Handle an incoming WebSocket message.
   *
   * @param ws - The Bun WebSocket server-side socket.
   * @param message - Raw message string.
   */
  async handleMessage(ws: WsServerSocket, message: string): Promise<void> {
    let msg: WsMessage
    try {
      msg = JSON.parse(message) as WsMessage
    } catch {
      return
    }

    if (msg.type === 'connection_init') {
      ws.send(JSON.stringify({ type: 'connection_ack' }))
      return
    }

    if (msg.type === 'subscribe' && msg.id && msg.payload?.query) {
      const document = parse(msg.payload.query)
      const result = await subscribe({
        schema: this.schema,
        document,
        variableValues: msg.payload.variables,
        operationName: msg.payload.operationName,
      })

      if ('next' in result) {
        const id = msg.id
        const iter = result as AsyncIterator<unknown>
        this.subscriptions.set(id, iter)

        // Stream results
        ;(async () => {
          for await (const data of result as AsyncIterable<unknown>) {
            ws.send(JSON.stringify({ type: 'next', id, payload: data }))
          }
          ws.send(JSON.stringify({ type: 'complete', id }))
          this.subscriptions.delete(id)
        })().catch(() => {
          // Subscription ended
        })
      } else {
        // Single result (query/mutation)
        ws.send(
          JSON.stringify({
            type: 'next',
            id: msg.id,
            payload: await execute({
              schema: this.schema,
              document,
              variableValues: msg.payload.variables,
              operationName: msg.payload.operationName,
            }),
          }),
        )
        ws.send(JSON.stringify({ type: 'complete', id: msg.id }))
      }
      return
    }

    if (msg.type === 'complete' && msg.id) {
      const iter = this.subscriptions.get(msg.id)
      if (iter?.return) await iter.return()
      this.subscriptions.delete(msg.id)
    }
  }

  /**
   * Handle WebSocket connection close.
   *
   * @param _ws - The Bun WebSocket server-side socket (unused).
   */
  handleClose(_ws: WsServerSocket): void {
    // Clean up all active subscriptions for this connection
    for (const [, iter] of this.subscriptions) {
      iter.return?.().catch(() => {})
    }
    this.subscriptions.clear()
  }
}

/**
 * Creates a {@link BunGraphQLWsHandler} for the given schema.
 *
 * @param schema - The built GraphQL schema.
 */
export function createWsHandler(schema: GraphQLSchema): BunGraphQLWsHandler {
  return new BunGraphQLWsHandler(schema)
}
