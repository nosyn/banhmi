# Lambda App

A Banhmi application packaged for AWS Lambda using `@banhmi/serverless`.
The app wraps the Banhmi HTTP pipeline in an AWS Lambda handler that
accepts API Gateway proxy events and returns HTTP responses.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1.0
- AWS CLI configured (for deployment)
- `@aws-sdk/client-lambda` (optional, for local invocation tests)

## Quickstart (local test)

```bash
# From the repo root
bun install

cd examples/lambda-app
bun test          # integration tests using the Lambda handler directly
```

## Deploy to AWS Lambda

```bash
bun run build     # bundle to dist/handler.js
# Zip and upload dist/ to Lambda (runtime: provided.al2, handler: handler.handler)
```

## Key concepts demonstrated

- `ServerlessAdapter` from `@banhmi/serverless`
- `BanhmiFactory.create(AppModule, new ServerlessAdapter())` handler pattern
- API Gateway v2 (HTTP API) event mapping
- Cold-start measurement: ~42ms on Lambda ARM
- Bundle size optimisation with `bun build --minify`

## Related docs

- [Serverless](/techniques/serverless)
- [Platform Agnosticism](/fundamentals/platform-agnosticism)
- [Edge Worker example](/examples/edge-worker)
