# Wave 8 — Microservices Implementation Plan

**Predecessor:** Wave 7 (GraphQL) — `v0.10.0-canary.wave7`, 1261 tests.
**Goal:** `@banhmi/microservices` with parity vs `@nestjs/microservices`.

## Scope

One package, multiple transports. Core abstractions:

- `MessagePattern(pattern)` and `EventPattern(pattern)` decorators on handler methods.
- `Transport` interface: `listen()`, `close()`, `send(pattern, data)`, `emit(pattern, data)`.
- Built-in transports: TCP, Redis (pub/sub), NATS, MQTT, RabbitMQ, Kafka, gRPC. Plus a `customTransport()` factory for extension.
- `MicroserviceModule.forRoot({ transport })` registers the chosen transport.
- `ClientProxy` for outgoing send/emit from the framework.
- Exception filters / pipes / guards / interceptors work in microservice contexts (the existing Banhmi enhancers should compose).

## Pragmatic budgets

This wave's surface is gigantic. Ship in tiers:

- **Tier A (must-ship):** Core types, TCP transport, Redis transport, custom transport, ClientProxy, message/event patterns, enhancer integration (filters/pipes/guards/interceptors run on inbound messages), one cluster app.
- **Tier B (ship if feasible):** NATS, MQTT, RabbitMQ.
- **Tier C (deferred OK):** Kafka, gRPC. These have heavy peer deps; ship interface-only stubs with clear TODO if they fight Bun. Document concretely.

Each transport is a peer dep on its respective client library (`ioredis` → already shipped, `nats`, `mqtt`, `amqplib`, `kafkajs`, `@grpc/grpc-js`).

## Tasks

1. Core types + abstractions (`MessagePattern`, `EventPattern`, `Transport`, `ClientProxy`).
2. TCP transport.
3. Redis transport (pub/sub).
4. Custom transport factory + the explorer for handler discovery.
5. Filters/Pipes/Guards/Interceptors integration in MS context.
6. NATS + MQTT + RabbitMQ (Tier B; mock-test if peer deps don't install).
7. Kafka + gRPC (Tier C; stub with TODO if needed).
8. Cluster app `examples/microservices-demo/`.
9. Verification gate + canary tag `v0.11.0-canary.wave8`.

## Files

```
packages/microservices/
  package.json (peer deps for each transport, all optional)
  tsconfig.json
  bunfig.toml
  src/index.ts
  src/microservice.module.ts
  src/decorators/{message-pattern,event-pattern,payload,ctx,client}.ts
  src/transports/{transport.interface,tcp,redis,nats,mqtt,rabbitmq,kafka,grpc,custom}.ts
  src/client/client-proxy.ts
  src/server/server.ts
  src/explorer.ts
  src/enhancers/integration.ts                  # connects existing filters/pipes/guards/interceptors
  src/types.ts
  src/tokens.ts
  test/{tcp,redis,custom,client-proxy,enhancers}.test.ts

examples/microservices-demo/
  ms-app/                     # subscriber service
  client-app/                 # producer service
  README.md
  test/integration.test.ts
```

## Conventions

- Same as prior waves. No `: any`/`!`/`reflect-metadata`.
- Bun-native APIs where practical (`Bun.connect`/`Bun.listen` for TCP).

## Doc pages

Replace placeholders at `apps/docs/apps/web/src/content/microservices/{overview,redis,mqtt,nats,rabbitmq,kafka,grpc,custom-transporters,exception-filters,pipes,guards,interceptors}.mdx`. Standard MDX template.

## Reference

NestJS microservices docs: https://docs.nestjs.com/microservices/basics. Lift API shapes; replace `@Injectable()` + `@Inject()` with our `static inject = [...]`.

## Self-review

Tier A delivered means the wave is ✅ even if Tier C is stubbed. Document the matrix in the Wave 8 summary.
