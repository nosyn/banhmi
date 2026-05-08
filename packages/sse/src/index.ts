/**
 * @banhmi/sse — Server-Sent Events helpers for Banhmi applications.
 *
 * Re-exports the `@Sse` route decorator from `@banhmi/common` and provides
 * `sseEventStream` / `sseHeartbeat` formatter helpers for building SSE
 * response streams.
 *
 * @example
 * import { Sse, sseEventStream, sseToReadableStream } from '@banhmi/sse'
 * import { StreamableFile } from 'banhmi'
 *
 * \@Controller()
 * class EventsController {
 *   \@Sse('/events')
 *   stream() {
 *     async function* source() {
 *       yield { data: { ts: Date.now() } }
 *     }
 *     return new StreamableFile(sseToReadableStream(source()))
 *   }
 * }
 */

export { Sse } from '@banhmi/common'
export type { SseEvent } from './sse-stream'
export {
  formatSseEvent,
  sseEventStream,
  sseHeartbeat,
  sseToReadableStream,
} from './sse-stream'
