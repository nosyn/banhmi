import { Module } from 'banhmi'
import { EventsController } from './events.controller'
import { TasksGateway } from './tasks.gateway'

/**
 * Events module — bundles the SSE controller and the WebSocket tasks gateway.
 */
@Module({
  controllers: [EventsController],
  gateways: [TasksGateway],
  providers: [TasksGateway],
})
export class EventsModule {}
