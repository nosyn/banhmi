import type {
  ClassConstructor,
  ExecutionContext,
  RouteCtx,
} from '@banhmi/common'

export class BunExecutionContext implements ExecutionContext {
  constructor(
    private readonly ctx: RouteCtx,
    private readonly controllerClass: ClassConstructor,
    private readonly handlerFn: (...args: unknown[]) => unknown,
  ) {}

  getCtx(): RouteCtx {
    return this.ctx
  }

  getHandler(): (...args: unknown[]) => unknown {
    return this.handlerFn
  }

  getClass(): ClassConstructor {
    return this.controllerClass
  }
}
