import type { CallHandler } from './call-handler'
import type { ExecutionContext } from './execution-context'

export interface Interceptor {
  intercept(context: ExecutionContext, next: CallHandler): Promise<unknown>
}
