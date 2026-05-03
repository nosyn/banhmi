import { BadRequestException } from '../exceptions/http-exceptions'
import type { PipeMetadata, PipeTransform } from '../interfaces/pipe'

interface StandardSchemaResult<T> {
  value?: T
  issues?: { message: string }[]
}

interface StandardSchema<T = unknown> {
  '~standard': {
    vendor: string
    version: number
    validate(value: unknown): StandardSchemaResult<T> | Promise<StandardSchemaResult<T>>
  }
}

export class ValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: StandardSchema<T>) {}

  async transform(value: unknown, _metadata: PipeMetadata): Promise<T> {
    const result = await this.schema['~standard'].validate(value)
    if (result.issues && result.issues.length > 0) {
      const message = result.issues.map((i) => i.message).join('; ')
      throw new BadRequestException(message)
    }
    return result.value as T
  }
}
