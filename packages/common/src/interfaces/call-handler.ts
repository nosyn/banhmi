export interface CallHandler {
  handle(): Promise<unknown>
}
