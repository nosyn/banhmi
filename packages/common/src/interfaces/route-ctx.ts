export interface RouteCtx {
  readonly request: Request
  readonly params: Readonly<Record<string, string>>
  readonly query: URLSearchParams
  readonly headers: Headers
  readonly ip: string
  readonly state: Record<string, unknown>
  /**
   * Raw request bytes, populated only when the application was created with
   * `rawBody: true`.  `undefined` otherwise.
   *
   * @example
   * const bytes = ctx.rawBody  // Uint8Array | undefined
   */
  readonly rawBody?: Uint8Array
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
}
