/**
 * `@banhmi/microservices` — microservices support for Banhmi.
 *
 * Provides TCP, Redis, NATS, MQTT, RabbitMQ transports (Tier A/B), Kafka and
 * gRPC stubs (Tier C), `MessagePattern` / `EventPattern` decorators,
 * `ClientProxy` for outgoing calls, and enhancer integration
 * (filters/guards/interceptors) for inbound message handling.
 *
 * @example
 * import { MicroserviceModule, tcpTransport, MessagePattern, Payload } from '@banhmi/microservices'
 *
 * \@Module({ imports: [MicroserviceModule.forRoot({ transport: tcpTransport({ port: 3001 }) })] })
 * class AppModule {}
 *
 * \@Injectable()
 * class CatsHandler {
 *   \@MessagePattern('cats.findOne')
 *   findOne(\@Payload() id: string) { return { id, name: 'Tom' } }
 * }
 *
 * @module
 */

// Module
export { MicroserviceModule } from './microservice.module'

// Client
export { ClientProxy, ClientsModule } from './client/client-proxy'

// Decorators
export { MessagePattern } from './decorators/message-pattern'
export { EventPattern } from './decorators/event-pattern'
export { Payload } from './decorators/payload'
export { Ctx } from './decorators/ctx'
export { Client } from './decorators/client'

// Transports — Tier A
export {
  TcpTransport,
  tcpTransport,
  type TcpTransportOptions,
} from './transports/tcp'
export {
  RedisTransport,
  redisTransport,
  type RedisTransportOptions,
} from './transports/redis'
export {
  customTransport,
  InMemoryTransport,
  type CustomTransportStrategy,
} from './transports/custom'

// Transports — Tier B
export {
  NatsTransport,
  natsTransport,
  type NatsTransportOptions,
} from './transports/nats'
export {
  MqttTransport,
  mqttTransport,
  type MqttTransportOptions,
} from './transports/mqtt'
export {
  RabbitMqTransport,
  rabbitMqTransport,
  type RabbitMqTransportOptions,
} from './transports/rabbitmq'

// Transports — Tier C (stubs)
export {
  KafkaTransport,
  kafkaTransport,
  type KafkaTransportOptions,
} from './transports/kafka'
export {
  GrpcTransport,
  grpcTransport,
  type GrpcTransportOptions,
} from './transports/grpc'

// Server
export { MicroserviceServer } from './server/server'

// Explorer
export {
  MicroserviceExplorer,
  type HandlerRegistration,
} from './explorer'

// Enhancers
export {
  runMsEnhancerPipeline,
  DefaultMsExceptionFilter,
  type MsExecutionContext,
  type MsGuard,
  type MsExceptionFilter,
} from './enhancers/integration'

// Types
export type {
  Transport,
  MicroserviceOptions,
  ClientOptions,
  MicroserviceMessage,
  MicroserviceResponse,
  MicroserviceError,
} from './types'

// Tokens
export {
  MS_TRANSPORT_TOKEN,
  MESSAGE_PATTERN_METADATA,
  EVENT_PATTERN_METADATA,
  PAYLOAD_METADATA,
  CTX_METADATA,
} from './tokens'
