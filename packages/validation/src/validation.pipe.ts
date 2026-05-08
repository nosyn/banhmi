import type { PipeMetadata, PipeTransform } from '@banhmi/common'
import { BadRequestException } from '@banhmi/common'
import type { ValidationError, Validator } from './validator'

/**
 * Extends `BadRequestException` to carry structured per-field `errors`.
 *
 * The `errors` array is exposed directly on the instance so callers can
 * inspect it without parsing a JSON string; the human-readable `message`
 * includes a JSON representation so the default `GlobalExceptionFilter`
 * automatically serialises it to the client.
 */
export class ValidationException extends BadRequestException {
  constructor(readonly errors: ValidationError[]) {
    super(JSON.stringify({ message: 'Validation failed', errors }))
    this.name = 'ValidationException'
  }
}

/**
 * A pipe that validates the incoming value via a `Validator<T>`. On failure
 * it throws a `ValidationException` (a `BadRequestException` subclass) that
 * carries the structured `errors` array so the client receives a
 * machine-readable 400 response.
 *
 * This pipe complements the `ValidationPipe` from `@banhmi/common`, which
 * implements the [Standard Schema](https://standardschema.dev) interface.
 * Use `AdaptedValidationPipe` when you want the `@banhmi/validation` adapter
 * API (`native` or `zod`).
 *
 * @example
 * import { z } from 'zod'
 * import { AdaptedValidationPipe } from '@banhmi/validation'
 * import { zod } from '@banhmi/validation/zod'
 *
 * const CreateCatSchema = z.object({ name: z.string() })
 *
 * const pipe = new AdaptedValidationPipe(zod(CreateCatSchema))
 *
 * \@Post()
 * async create(ctx: RouteCtx) {
 *   const dto = pipe.transform(await ctx.json(), { type: 'body' })
 *   return dto
 * }
 */
export class AdaptedValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly validator: Validator<T>) {}

  transform(value: unknown, _metadata: PipeMetadata): T {
    const r = this.validator.safeParse(value)
    if (!r.ok) {
      throw new ValidationException(r.errors)
    }
    return r.value
  }
}
