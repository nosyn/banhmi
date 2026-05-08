import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
export class TestingModuleRef {
  app
  constructor(app) {
    this.app = app
  }
  get(token) {
    return this.app.container.resolve(token)
  }
  async close() {
    await this.app.close()
  }
}
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class BanhmiTestingModule {
  static async createTestingModule(options) {
    const providers = [...(options.providers ?? [])]
    for (const override of options.overrides ?? []) {
      providers.push({
        provide: override.token,
        useValue: override.useValue,
      })
    }
    @Module({
      imports: options.imports ?? [],
      providers,
    })
    class TestModule {}
    const app = await BanhmiFactory.create(TestModule)
    return new TestingModuleRef(app)
  }
}
