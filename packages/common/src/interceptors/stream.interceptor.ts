import type { CallHandler } from '../interfaces/call-handler'
import type { ExecutionContext } from '../interfaces/execution-context'
import type { Interceptor } from '../interfaces/interceptor'
import { StreamableFile } from '../streamable-file'

export abstract class StreamInterceptor implements Interceptor {
  abstract transform(chunk: Uint8Array): Uint8Array

  async intercept(_ctx: ExecutionContext, next: CallHandler): Promise<unknown> {
    const result = await next.handle()

    if (!(result instanceof StreamableFile)) return result

    const self = this
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(self.transform(chunk))
      },
    })

    result.stream.pipeTo(writable).catch(() => {})

    return new StreamableFile(readable, {
      contentType: result.contentType,
      disposition: result.disposition,
    })
  }
}
