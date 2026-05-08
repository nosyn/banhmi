import type { RouteCtx } from '@banhmi/common'

export class BunRouteCtx implements RouteCtx {
  #url?: URL
  readonly state: Record<string, unknown> = {}

  constructor(
    readonly request: Request,
    readonly params: Readonly<Record<string, string>>,
    readonly rawBody?: Uint8Array,
  ) {}

  get query(): URLSearchParams {
    this.#url ??= new URL(this.request.url)
    return this.#url.searchParams
  }

  get headers(): Headers {
    return this.request.headers
  }

  get ip(): string {
    const xff = this.request.headers.get('x-forwarded-for')
    return xff ? (xff.split(',')[0]?.trim() ?? 'unknown') : 'unknown'
  }

  json<T = unknown>(): Promise<T> {
    return this.request.clone().json() as Promise<T>
  }

  text(): Promise<string> {
    return this.request.clone().text()
  }

  formData(): Promise<FormData> {
    return this.request.clone().formData()
  }
}
