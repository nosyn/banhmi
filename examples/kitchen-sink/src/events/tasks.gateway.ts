import { EVENT_EMITTER_TOKEN, type EventEmitter } from '@banhmi/events'
import type {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsContext,
} from 'banhmi'
import {
  Injectable,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from 'banhmi'
import type { Server } from 'bun'

/**
 * WebSocket gateway — clients connect on `/ws/tasks`.
 *
 * - On `subscribe` message: the client starts receiving `task.created` and
 *   `task.deleted` frames forwarded from the in-process event emitter.
 * - On `ping` message: returns `{ event: 'pong' }`.
 *
 * The gateway subscribes to the `task-feed` pub/sub topic when a client
 * connects and publishes to it on every in-process event.
 */
@WebSocketGateway({ path: '/ws/tasks' })
@Injectable()
export class TasksGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  static inject = [EVENT_EMITTER_TOKEN] as const

  @WebSocketServer()
  server!: Server

  constructor(private readonly emitter: EventEmitter) {}

  afterInit(_server: unknown): void {
    // Forward in-process events to all subscribed WS clients
    this.emitter.on('task.created', (task) => {
      this.server.publish(
        'task-feed',
        JSON.stringify({ event: 'task.created', data: task }),
      )
    })
    this.emitter.on('task.deleted', (payload) => {
      this.server.publish(
        'task-feed',
        JSON.stringify({ event: 'task.deleted', data: payload }),
      )
    })
  }

  handleConnection(ctx: WsContext): void {
    ctx.subscribe('task-feed')
  }

  handleDisconnect(_ctx: WsContext): void {
    // nothing to clean up
  }

  @SubscribeMessage('ping')
  handlePing(_ctx: WsContext): { event: string } {
    return { event: 'pong' }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(ctx: WsContext): { event: string; message: string } {
    ctx.subscribe('task-feed')
    return { event: 'subscribed', message: 'You are subscribed to task-feed' }
  }
}
