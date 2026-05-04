export interface RouteCtx {
  readonly request: Request
  readonly params: Readonly<Record<string, string>>
  readonly query: URLSearchParams
  readonly headers: Headers
  readonly ip: string
  readonly state: Record<string, unknown>
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
}
