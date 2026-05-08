/**
 * A single Server-Sent Event to be formatted and emitted.
 *
 * @example
 * const event: SseEvent = { event: 'message', id: '1', data: { x: 1 } }
 */
export type SseEvent = {
  /** Event payload. Non-string values are JSON-serialised; strings are emitted as-is. */
  data: unknown
  /** Optional event name (emits `event:` field). */
  event?: string
  /** Optional event ID (emits `id:` field). */
  id?: string
  /** Optional reconnect timeout in ms (emits `retry:` field). */
  retry?: number
}

/**
 * Format a single {@link SseEvent} into the SSE wire-protocol string.
 *
 * Each field is emitted on its own line; the message ends with `\n\n`.
 * Multi-line string data is split into multiple `data:` lines as required
 * by the SSE specification. Non-string data is JSON-serialised.
 *
 * @param event - The event to format.
 * @returns A string ready to write into a `text/event-stream` response body.
 *
 * @example
 * formatSseEvent({ event: 'tick', id: '1', data: { ts: Date.now() } })
 * // "event: tick\nid: 1\ndata: {"ts":1234}\n\n"
 */
export function formatSseEvent(event: SseEvent): string {
  const lines: string[] = []

  if (event.event !== undefined) {
    lines.push(`event: ${event.event}`)
  }
  if (event.id !== undefined) {
    lines.push(`id: ${event.id}`)
  }
  if (event.retry !== undefined) {
    lines.push(`retry: ${event.retry}`)
  }

  const rawData = event.data
  const dataStr =
    typeof rawData === 'string' ? rawData : JSON.stringify(rawData)

  // Multi-line data must prefix each line with "data: "
  const dataLines = dataStr.split('\n')
  for (const line of dataLines) {
    lines.push(`data: ${line}`)
  }

  return `${lines.join('\n')}\n\n`
}

/**
 * Transform an async iterable of {@link SseEvent} objects into an async
 * iterable of SSE wire-protocol strings. Each yielded string ends with `\n\n`
 * and is ready to be encoded and sent as part of a `text/event-stream`
 * response.
 *
 * @param source - Async iterable producing events.
 * @returns An async iterable of formatted SSE strings.
 *
 * @example
 * async function* events(): AsyncIterable<SseEvent> {
 *   yield { data: { count: 1 } }
 *   yield { event: 'done', data: null }
 * }
 *
 * for await (const chunk of sseEventStream(events())) {
 *   console.log(chunk)
 * }
 */
export async function* sseEventStream(
  source: AsyncIterable<SseEvent>,
): AsyncIterable<string> {
  for await (const event of source) {
    yield formatSseEvent(event)
  }
}

/**
 * Yield a `{ event: 'heartbeat', data: {} }` SSE event every `intervalMs`
 * milliseconds. The generator runs indefinitely until the consumer breaks or
 * returns from the iterator.
 *
 * Use this to keep SSE connections alive through proxies that close idle
 * connections.
 *
 * @param intervalMs - Milliseconds between heartbeat events.
 *
 * @example
 * // Merge heartbeats with your own event stream (generator pattern):
 * for await (const hb of sseHeartbeat(15_000)) {
 *   yield hb
 * }
 */
export async function* sseHeartbeat(
  intervalMs: number,
): AsyncIterable<SseEvent> {
  while (true) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    yield { event: 'heartbeat', data: {} }
  }
}

/**
 * Convert an async iterable of {@link SseEvent} objects into a
 * {@link ReadableStream} of UTF-8 encoded SSE wire frames.
 *
 * Useful when you need to pass the stream directly to a `Response` or a
 * {@link StreamableFile}.
 *
 * @param source - Async iterable of events.
 * @returns A `ReadableStream<Uint8Array>` ready for use as a response body.
 *
 * @example
 * return new StreamableFile(sseToReadableStream(eventSource), {
 *   contentType: 'text/event-stream',
 * })
 */
export function sseToReadableStream(
  source: AsyncIterable<SseEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of sseEventStream(source)) {
          controller.enqueue(encoder.encode(chunk))
        }
      } finally {
        controller.close()
      }
    },
  })
}
