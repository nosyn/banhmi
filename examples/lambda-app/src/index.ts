/**
 * AWS Lambda entry point.
 *
 * Export `handler` as the Lambda function handler.  API Gateway routes all
 * requests to this function; the Banhmi serverless adapter translates the
 * event into a `Request`, runs the pipeline, and converts the `Response` back
 * into the `LambdaResult` shape expected by API Gateway.
 *
 * Works with both API Gateway v1 (REST API) and v2 (HTTP API) event formats.
 *
 * @example
 * // sam local invoke --event event.json
 */
import { createLambdaHandler } from '@banhmi/serverless'
import { AppModule } from './app.module'

export const handler = await createLambdaHandler(AppModule)
