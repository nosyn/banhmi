/**
 * Demo: Scalar API Reference UI via @banhmi/openapi.
 *
 * Registers a CatsController, builds an OpenAPI document with DocumentBuilder,
 * and calls SwaggerModule.setup('/api', app, doc) — the default ui:'scalar'.
 *
 * Endpoints:
 *  GET /api          → Scalar UI HTML
 *  GET /api/openapi.json → OpenAPI spec JSON
 *  GET /cats         → list of cats
 */
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
  DocumentBuilder,
  SwaggerModule,
} from '@banhmi/openapi'
import { Controller, Get, Module } from 'banhmi'
import { BanhmiFactory } from 'banhmi'

/** A cat model with documented properties. */
export class CatModel {
  @ApiProperty({ type: 'number', format: 'int', description: 'Unique identifier' })
  id: number = 0

  @ApiProperty({ type: 'string', example: 'Whiskers', description: 'Cat name' })
  name: string = ''
}

/** Controller that lists cats — documented with OpenAPI decorators. */
@ApiTags('cats')
@Controller('/cats')
export class CatsController {
  @ApiOperation({ summary: 'List all cats' })
  @ApiResponse({ status: 200, description: 'Returns the list of cats' })
  @Get()
  findAll() {
    return [
      { id: 1, name: 'Whiskers' },
      { id: 2, name: 'Luna' },
    ]
  }
}

@Module({ controllers: [CatsController] })
export class AppModule {}

// Only start the server when run directly
if (import.meta.main) {
  const app = await BanhmiFactory.create(AppModule)
  const doc = new DocumentBuilder()
    .setTitle('Cats API — Scalar UI')
    .setVersion('1.0.0')
    .setDescription('Demo: Scalar UI with @banhmi/openapi')
    .build()
  SwaggerModule.setup('/api', app, doc)
  await app.listen(3100)
  console.log('Scalar UI: http://localhost:3100/api')
  console.log('OpenAPI JSON: http://localhost:3100/api/openapi.json')
}
