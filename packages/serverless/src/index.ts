/**
 * `@banhmi/serverless` — AWS Lambda / Vercel serverless adapter for Banhmi.
 *
 * Provides `createLambdaHandler` which bootstraps a Banhmi application and
 * returns a `(event, context) => Promise<LambdaResult>` handler compatible
 * with AWS Lambda + API Gateway v1 (REST API) and v2 (HTTP API).
 *
 * @example
 * import { createLambdaHandler } from '@banhmi/serverless'
 * import { AppModule } from './app.module'
 * export const handler = await createLambdaHandler(AppModule)
 *
 * @module
 */

export { createLambdaHandler } from './lambda-adapter'
export type {
  ApiGatewayEvent,
  ApiGatewayV1Event,
  ApiGatewayV2Event,
  LambdaOptions,
  LambdaResult,
} from './types'
