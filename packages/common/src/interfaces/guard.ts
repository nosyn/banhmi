import type { ExecutionContext } from './execution-context'

export interface Guard {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>
}
