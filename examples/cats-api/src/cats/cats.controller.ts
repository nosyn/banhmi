import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@banhmi/openapi'
import { AdaptedValidationPipe } from '@banhmi/validation'
import { zod } from '@banhmi/validation/zod'
import type { RouteCtx } from 'banhmi'
import { Controller, Delete, Get, HttpCode, Post } from 'banhmi'
import { z } from 'zod'
import { CatsService } from './cats.service'

/**
 * Zod schema used to validate the CreateCat request body.
 */
export const CreateCatSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
})

/**
 * Validated CreateCat DTO type.
 */
export type CreateCatDto = z.infer<typeof CreateCatSchema>

/** Shared pipe instance reused across handlers. */
const createCatPipe = new AdaptedValidationPipe(zod(CreateCatSchema))

/**
 * OpenAPI model class for a Cat entity.
 */
export class Cat {
  @ApiProperty({ type: 'number', format: 'int', description: 'Unique cat ID' })
  id: number = 0

  @ApiProperty({ type: 'string', example: 'Whiskers', description: 'Cat name' })
  name: string = ''

  @ApiProperty({ type: 'number', format: 'int', description: 'Age in years', required: false })
  age?: number
}

/**
 * Handles CRUD operations for cats (v1 controller — returns `{ id, name }`).
 *
 * All endpoints are documented with OpenAPI decorators from `@banhmi/openapi`.
 */
@ApiTags('cats')
@Controller('/cats')
export class CatsController {
  static inject = [CatsService] as const

  constructor(private cats: CatsService) {}

  @ApiOperation({ summary: 'List cats', description: 'Returns all cats in the store.' })
  @ApiResponse({ status: 200, description: 'Array of cat objects', type: [Cat] })
  @Get()
  findAll() {
    return this.cats.findAll()
  }

  @ApiOperation({ summary: 'Get a cat by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Cat ID', required: true })
  @ApiResponse({ status: 200, description: 'The requested cat', type: Cat })
  @ApiResponse({ status: 404, description: 'Cat not found' })
  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.cats.findById(Number(ctx.params.id))
  }

  @ApiOperation({ summary: 'Create a cat' })
  @ApiBody({ type: 'object', description: 'Cat creation payload', required: true })
  @ApiResponse({ status: 201, description: 'Cat created successfully', type: Cat })
  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const body = await ctx.json<unknown>()
    const dto = createCatPipe.transform(body, { type: 'body' })
    return this.cats.create(dto.name, dto.age)
  }

  @ApiOperation({ summary: 'Delete a cat' })
  @ApiParam({ name: 'id', type: 'string', description: 'Cat ID', required: true })
  @ApiResponse({ status: 204, description: 'Cat deleted' })
  @Delete('/:id')
  @HttpCode(204)
  remove(ctx: RouteCtx) {
    this.cats.delete(Number(ctx.params.id))
  }
}
