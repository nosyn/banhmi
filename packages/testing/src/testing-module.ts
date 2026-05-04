import type { ClassConstructor, ProviderDef } from '@banhmi/common'
import { Module } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'

export interface TestingModuleOptions {
  imports?: ClassConstructor[]
  providers?: ProviderDef[]
  overrides?: Array<{ token: ClassConstructor | symbol; useValue: unknown }>
}

export class TestingModuleRef {
  constructor(private readonly app: BanhmiApplication) {}

  get<T>(token: ClassConstructor<T> | symbol): T {
    return this.app.container.resolve(token as ClassConstructor<T>) as T
  }

  async close(): Promise<void> {
    await this.app.close()
  }
}

export class BanhmiTestingModule {
  static async createTestingModule(
    options: TestingModuleOptions,
  ): Promise<TestingModuleRef> {
    const providers: ProviderDef[] = [...(options.providers ?? [])]

    for (const override of options.overrides ?? []) {
      providers.push({
        provide: override.token as symbol,
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
