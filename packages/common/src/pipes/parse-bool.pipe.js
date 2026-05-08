import { BadRequestException } from '../exceptions/http-exceptions'
export class ParseBoolPipe {
  transform(value, _metadata) {
    if (value === 'true') return true
    if (value === 'false') return false
    throw new BadRequestException(
      `"${value}" is not a valid boolean (use "true" or "false")`,
    )
  }
}
