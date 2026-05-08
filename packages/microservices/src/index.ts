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

// Client
export { ClientProxy, ClientsModule } from './client/client-proxy'
export { Client } from './decorators/client'
export { Ctx } from './decorators/ctx'
export { EventPattern } from './decorators/event-pattern'
// Decorators
export { MessagePattern } from './decorators/message-pattern'
export { Payload } from './decorators/payload'
// Enhancers
export {
  DefaultMsExceptionFilter,
  type MsExceptionFilter,
  type MsExecutionContext,
  type MsGuard,
  runMsEnhancerPipeline,
} from './enhancers/integration'
// Explorer
export {
  type HandlerRegistration,
  MicroserviceExplorer,
} from './explorer'
// Module
export { MicroserviceModule } from './microservice.module'
// Server
export { MicroserviceServer } from './server/server'
// Tokens
export {
  CTX_METADATA,
  EVENT_PATTERN_METADATA,
  MESSAGE_PATTERN_METADATA,
  MS_TRANSPORT_TOKEN,
  PAYLOAD_METADATA,
} from './tokens'
export {
  type CustomTransportStrategy,
  customTransport,
  InMemoryTransport,
} from './transports/custom'
export {
  GrpcTransport,
  type GrpcTransportOptions,
  grpcTransport,
} from './transports/grpc'

// Transports — Tier C (stubs)
export {
  KafkaTransport,
  type KafkaTransportOptions,
  kafkaTransport,
} from './transports/kafka'
export {
  MqttTransport,
  type MqttTransportOptions,
  mqttTransport,
} from './transports/mqtt'
// Transports — Tier B
export {
  NatsTransport,
  type NatsTransportOptions,
  natsTransport,
} from './transports/nats'
export {
  RabbitMqTransport,
  type RabbitMqTransportOptions,
  rabbitMqTransport,
} from './transports/rabbitmq'
export {
  RedisTransport,
  type RedisTransportOptions,
  redisTransport,
} from './transports/redis'
// Transports — Tier A
export {
  TcpTransport,
  type TcpTransportOptions,
  tcpTransport,
} from './transports/tcp'
// Types
export type {
  ClientOptions,
  MicroserviceError,
  MicroserviceMessage,
  MicroserviceOptions,
  MicroserviceResponse,
  Transport,
} from './types'
