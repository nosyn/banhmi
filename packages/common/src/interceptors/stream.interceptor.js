import { StreamableFile } from '../streamable-file'
export class StreamInterceptor {
  async intercept(_ctx, next) {
    const result = await next.handle()
    if (!(result instanceof StreamableFile)) return result
    const self = this
    const { readable, writable } = new TransformStream({
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
