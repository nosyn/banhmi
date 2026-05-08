export class BunRouteCtx {
  request
  params
  #url
  state = {}
  constructor(request, params) {
    this.request = request
    this.params = params
  }
  get query() {
    this.#url ??= new URL(this.request.url)
    return this.#url.searchParams
  }
  get headers() {
    return this.request.headers
  }
  get ip() {
    const xff = this.request.headers.get('x-forwarded-for')
    return xff ? (xff.split(',')[0]?.trim() ?? 'unknown') : 'unknown'
  }
  json() {
    return this.request.clone().json()
  }
  text() {
    return this.request.clone().text()
  }
  formData() {
    return this.request.clone().formData()
  }
}
