# Microservices Demo

Two Banhmi services communicating over TCP: a `ms-app` microservice that
handles `cats.findAll` and `cats.create` patterns, and a `client-app`
HTTP API that proxies requests to the microservice via `ClientProxy`.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- No external services required (uses in-process TCP)

## Quickstart

```bash
# From the repo root
bun install

cd examples/microservices-demo

# Start the microservice (port 3001)
bun run start:ms

# In another terminal: start the HTTP client API (port 3000)
bun run start:client
```

Client API at `http://localhost:3000`.
Microservice TCP at `localhost:3001`.

## Key concepts demonstrated

- `MicroserviceModule.forRoot` with `tcpTransport`
- `@MessagePattern` for request/reply handlers
- `@EventPattern` for fire-and-forget events
- `ClientProxy.send` / `ClientProxy.emit` from a Banhmi HTTP controller
- `InMemoryTransport` used in integration tests

## Related docs

- [Microservices Overview](/microservices/overview)
- [TCP Transport](/microservices/tcp)
- [Custom Transporters](/microservices/custom-transporters)
