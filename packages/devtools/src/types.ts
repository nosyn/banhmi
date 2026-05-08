/**
 * Options for {@link DevtoolsModule}.
 *
 * @example
 * DevtoolsModule.forRoot({ path: '/_devtools', profileSize: 50 })
 */
export type DevtoolsOptions = {
  /**
   * Whether to mount the devtools middleware.
   *
   * Defaults to `true` when `Bun.env.NODE_ENV !== 'production'`.
   */
  enabled?: boolean
  /**
   * Mount prefix for all devtools endpoints.
   *
   * @default '/__banhmi/devtools'
   */
  path?: string
  /**
   * Maximum number of profile records to keep in memory (ring buffer size).
   *
   * @default 100
   */
  profileSize?: number
}

/** A single node in the DI graph. */
export type DiNode = {
  /** Stable identifier: `module:<name>`, `provider:<name>`, or `controller:<name>`. */
  id: string
  kind: 'module' | 'provider' | 'controller'
  name: string
}

/** A directed edge in the DI graph. */
export type DiEdge = {
  from: string
  to: string
  /** `imports`: module→module; `provides`: module→item; `depends-on`: item→dep. */
  kind: 'imports' | 'provides' | 'depends-on'
}

/** The full serialised DI graph. */
export type DiGraph = {
  nodes: DiNode[]
  edges: DiEdge[]
}

/** One timing stage within a profiled request. */
export type ProfileStage = {
  name: string
  durationMs: number
}

/** A single profiled HTTP request record. */
export type ProfileRecord = {
  traceId: string
  route: string
  method: string
  statusCode: number
  totalMs: number
  stages: ProfileStage[]
  timestamp: number
}
