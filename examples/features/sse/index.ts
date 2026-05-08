// Demo: SSE clock endpoint using @banhmi/sse.
// The /clock endpoint yields the current ISO timestamp once every 200 ms for
// up to 1 s (5 events), then closes the stream.

import type { SseEvent } from '@banhmi/sse'
import { Sse, sseToReadableStream } from '@banhmi/sse'
import { Controller, Module, StreamableFile } from 'banhmi'

@Controller()
export class ClockController {
  @Sse('/clock')
  clock() {
    async function* source(): AsyncIterable<SseEvent> {
      for (let i = 0; i < 5; i++) {
        yield {
          event: 'tick',
          id: String(i + 1),
          data: { ts: new Date().toISOString() },
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 200))
      }
    }
    return new StreamableFile(sseToReadableStream(source()))
  }
}

@Module({ controllers: [ClockController] })
export class AppModule {}
