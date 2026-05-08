/**
 * Versioning micro-example — two controllers serving `/cats` under different
 * API versions via URI path segments (`/v1/cats` and `/v2/cats`).
 *
 * Run:  bun run index.ts
 * Test: bun test feature.test.ts
 */

import { Controller, Get, Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Version, VersioningModule } from '@banhmi/versioning'

// ─── v1 controller ────────────────────────────────────────────────────────────

@Version('1')
@Controller('/cats')
class CatsV1Controller {
  @Get()
  findAll() {
    return { version: 1, cats: [{ name: 'Kitty', breed: 'Tabby' }] }
  }
}

// ─── v2 controller ────────────────────────────────────────────────────────────

@Version('2')
@Controller('/cats')
class CatsV2Controller {
  @Get()
  findAll() {
    return {
      version: 2,
      cats: [
        { name: 'Luna', breed: 'Siamese', color: 'grey' },
        { name: 'Mochi', breed: 'Ragdoll', color: 'white' },
      ],
    }
  }
}

// ─── App module ───────────────────────────────────────────────────────────────

@Module({
  imports: [VersioningModule.forRoot({ type: 'uri', prefix: 'v' })],
  controllers: [CatsV1Controller, CatsV2Controller],
})
class AppModule {}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const app = await BanhmiFactory.create(AppModule)
await app.listen(3000)
console.log('Versioning example running on http://localhost:3000')
console.log('  GET /v1/cats  →  version 1 list')
console.log('  GET /v2/cats  →  version 2 list (richer payload)')
