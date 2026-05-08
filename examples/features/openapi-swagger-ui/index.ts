/**
 * Demo: Classic Swagger UI via @banhmi/openapi with ui:'swagger' option.
 *
 * Shows how to opt-in to the Swagger UI renderer instead of the default Scalar UI.
 *
 * Endpoints:
 *  GET /api          → Swagger UI HTML
 *  GET /api/openapi.json → OpenAPI spec JSON
 *  GET /items        → list of items
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

/** A simple item model. */
export class ItemModel {
  @ApiProperty({ type: 'number', format: 'int', description: 'Unique identifier' })
  id: number = 0

  @ApiProperty({ type: 'string', example: 'Widget', description: 'Item name' })
  name: string = ''
}

/** Controller that manages items. */
@ApiTags('items')
@Controller('/items')
export class ItemsController {
  @ApiOperation({ summary: 'List all items' })
  @ApiResponse({ status: 200, description: 'Returns the list of items' })
  @Get()
  findAll() {
    return [
      { id: 1, name: 'Widget' },
      { id: 2, name: 'Gadget' },
    ]
  }
}

@Module({ controllers: [ItemsController] })
export class AppModule {}

// Only start the server when run directly
if (import.meta.main) {
  const app = await BanhmiFactory.create(AppModule)
  const doc = new DocumentBuilder()
    .setTitle('Items API — Swagger UI')
    .setVersion('1.0.0')
    .setDescription('Demo: Classic Swagger UI with @banhmi/openapi')
    .build()
  SwaggerModule.setup('/api', app, doc, { ui: 'swagger' })
  await app.listen(3101)
  console.log('Swagger UI: http://localhost:3101/api')
  console.log('OpenAPI JSON: http://localhost:3101/api/openapi.json')
}
