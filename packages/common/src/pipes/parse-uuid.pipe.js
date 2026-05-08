import { BadRequestException } from '../exceptions/http-exceptions'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export class ParseUUIDPipe {
  transform(value, _metadata) {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException(`"${value}" is not a valid UUID`)
    }
    return value
  }
}
