import { BadRequestException } from '../exceptions/http-exceptions'
import type { PipeMetadata, PipeTransform } from '../interfaces/pipe'

export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, _metadata: PipeMetadata): number {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || String(parsed) !== value) {
      throw new BadRequestException(`"${value}" is not a valid integer`)
    }
    return parsed
  }
}
