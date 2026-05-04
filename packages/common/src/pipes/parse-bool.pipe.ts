import { BadRequestException } from '../exceptions/http-exceptions'
import type { PipeMetadata, PipeTransform } from '../interfaces/pipe'

export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string, _metadata: PipeMetadata): boolean {
    if (value === 'true') return true
    if (value === 'false') return false
    throw new BadRequestException(
      `"${value}" is not a valid boolean (use "true" or "false")`,
    )
  }
}
