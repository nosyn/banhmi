import { Version } from '@banhmi/versioning'
import { Controller, Get } from 'banhmi'
import { CatsService } from './cats.service'

/**
 * Versioned cats controller — v1 returns `{ id, name }` only.
 */
@Version('1')
@Controller('/cats')
export class CatsV1Controller {
  static inject = [CatsService] as const

  constructor(private cats: CatsService) {}

  @Get()
  findAll() {
    return this.cats.findAll().map(({ id, name }) => ({ id, name }))
  }
}
