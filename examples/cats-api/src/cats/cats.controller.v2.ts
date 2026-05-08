import { Version } from '@banhmi/versioning'
import { Controller, Get } from 'banhmi'
import { CatsService } from './cats.service'

/**
 * Versioned cats controller — v2 returns `{ id, name, age }`.
 */
@Version('2')
@Controller('/cats')
export class CatsV2Controller {
  static inject = [CatsService] as const

  constructor(private cats: CatsService) {}

  @Get()
  findAll() {
    return this.cats.findAll()
  }
}
