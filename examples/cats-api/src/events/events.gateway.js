import {
  Injectable,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from 'banhmi'
@WebSocketGateway({ path: '/events' })
@Injectable()
export class EventsGateway {
  @WebSocketServer()
  server
  afterInit(_server) {
    console.log('EventsGateway initialized')
  }
  handleConnection(ctx) {
    console.log(`Client connected from ${ctx.remoteAddress}`)
  }
  handleDisconnect(_ctx) {
    console.log('Client disconnected')
  }
  @SubscribeMessage('ping')
  handlePing(_ctx) {
    return { message: 'pong', timestamp: Date.now() }
  }
  @SubscribeMessage('broadcast')
  handleBroadcast(ctx) {
    const msg = ctx.data
    ctx.subscribe('room')
    ctx.publish(
      'room',
      JSON.stringify({ event: 'message', data: { text: msg.text } }),
    )
  }
}
