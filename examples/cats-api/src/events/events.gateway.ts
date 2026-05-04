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

@WebSocketGateway({ path: '/events' })
@Injectable()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server

  afterInit(_server: unknown): void {
    console.log('EventsGateway initialized')
  }

  handleConnection(ctx: WsContext): void {
    console.log(`Client connected from ${ctx.remoteAddress}`)
  }

  handleDisconnect(_ctx: WsContext): void {
    console.log('Client disconnected')
  }

  @SubscribeMessage('ping')
  handlePing(_ctx: WsContext): { message: string; timestamp: number } {
    return { message: 'pong', timestamp: Date.now() }
  }

  @SubscribeMessage('broadcast')
  handleBroadcast(ctx: WsContext): void {
    const msg = ctx.data as { text: string }
    ctx.subscribe('room')
    ctx.publish(
      'room',
      JSON.stringify({ event: 'message', data: { text: msg.text } }),
    )
  }
}
