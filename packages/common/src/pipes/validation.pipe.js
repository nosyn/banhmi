import { BadRequestException } from '../exceptions/http-exceptions'
export class ValidationPipe {
  schema
  constructor(schema) {
    this.schema = schema
  }
  async transform(value, _metadata) {
    const result = await this.schema['~standard'].validate(value)
    if (result.issues && result.issues.length > 0) {
      const message = result.issues.map((i) => i.message).join('; ')
      throw new BadRequestException(message)
    }
    return result.value
  }
}
