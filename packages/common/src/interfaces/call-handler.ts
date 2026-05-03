export interface CallHandler {
  handle(): Promise<Response>
}
