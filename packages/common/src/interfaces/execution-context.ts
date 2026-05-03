import type { RouteCtx } from './route-ctx'

export interface ExecutionContext {
  getCtx(): RouteCtx
  getHandler(): (...args: unknown[]) => unknown
  getClass(): new (...args: unknown[]) => unknown
}
