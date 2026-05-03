import type { ExecutionContext } from './execution-context'

export interface ExceptionFilter<T = unknown> {
  catch(exception: T, context: ExecutionContext): Response | Promise<Response>
}
