// Demo: @banhmi/devtools — DI graph inspector + request profiler.
//
// Mount DevtoolsModule.forRoot() and visit /__banhmi/devtools to explore the
// application's module tree and recent request timings.

import { DevtoolsModule } from '@banhmi/devtools'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Injectable, Module } from 'banhmi'

@Injectable()
export class CatalogService {
  static inject = [] as const

  items() {
    return [
      { id: 1, name: 'Widget A' },
      { id: 2, name: 'Widget B' },
    ]
  }
}

@Controller('/catalog')
export class CatalogController {
  static inject = [CatalogService] as const
  constructor(private svc: CatalogService) {}

  @Get()
  list(_ctx: RouteCtx) {
    return this.svc.items()
  }
}

@Module({
  imports: [DevtoolsModule.forRoot()],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class AppModule {}
