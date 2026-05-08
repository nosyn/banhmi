import { Module } from 'banhmi'
import { CatsModule } from './cats/cats.module'
import { EventsGateway } from './events/events.gateway'
@Module({
  imports: [CatsModule],
  gateways: [EventsGateway],
  providers: [EventsGateway],
})
export class AppModule {}
