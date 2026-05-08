export class BunExecutionContext {
  ctx
  controllerClass
  handlerFn
  constructor(ctx, controllerClass, handlerFn) {
    this.ctx = ctx
    this.controllerClass = controllerClass
    this.handlerFn = handlerFn
  }
  getCtx() {
    return this.ctx
  }
  getHandler() {
    return this.handlerFn
  }
  getClass() {
    return this.controllerClass
  }
}
