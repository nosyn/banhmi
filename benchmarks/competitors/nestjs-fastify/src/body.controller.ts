import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { IsNumber, IsString, validate } from 'class-validator'

/**
 * Ten-field DTO for the validation scenario.
 * Uses class-validator decorators for field validation.
 */
class TenFieldDto {
  @IsString()
  f1: string = ''
  @IsString()
  f2: string = ''
  @IsString()
  f3: string = ''
  @IsString()
  f4: string = ''
  @IsString()
  f5: string = ''
  @IsNumber()
  n1: number = 0
  @IsNumber()
  n2: number = 0
  @IsNumber()
  n3: number = 0
  @IsNumber()
  n4: number = 0
  @IsNumber()
  n5: number = 0
}

/**
 * Controller exposing json-roundtrip and validation endpoints for benchmark
 * comparison with Banhmi. File upload on Fastify uses `@fastify/multipart`
 * which has a different API surface; stubbed with a JSON stub for Wave 1.
 *
 * NOTE (Wave 1): The `/upload` endpoint is stubbed — `@fastify/multipart`
 * requires separate bootstrap wiring that conflicts with NestJS Fastify's
 * standard adapter setup under Bun. A real implementation is tracked for Wave 11.
 */
@Controller()
export class BodyController {
  /** Echo the JSON request body back to the caller. */
  @Post('/json')
  @HttpCode(200)
  echo(@Body() body: unknown) {
    return body
  }

  /** Validate a ten-field DTO with class-validator and respond `{ ok: true }`. */
  @Post('/validate')
  @HttpCode(200)
  async validateBody(@Body() raw: Record<string, unknown>) {
    const dto = Object.assign(new TenFieldDto(), raw)
    const errors = await validate(dto)
    if (errors.length > 0) {
      return { ok: false, errors: errors.map((e) => e.toString()) }
    }
    return { ok: true }
  }

  /**
   * File upload stub — returns a static response.
   * Real multipart upload via `@fastify/multipart` is deferred to Wave 11.
   */
  @Post('/upload')
  @HttpCode(200)
  upload() {
    return { mimetype: 'application/octet-stream', size: 0, stub: true }
  }
}
