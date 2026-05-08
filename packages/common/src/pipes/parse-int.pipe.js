import { BadRequestException } from '../exceptions/http-exceptions'
export class ParseIntPipe {
  transform(value, _metadata) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || String(parsed) !== value) {
      throw new BadRequestException(`"${value}" is not a valid integer`)
    }
    return parsed
  }
}
