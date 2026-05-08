export class StreamableFile {
  stream
  contentType
  disposition
  constructor(stream, options) {
    this.stream = stream
    this.contentType = options?.contentType
    this.disposition = options?.disposition
  }
  static fromBytes(data, options) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })
    return new StreamableFile(stream, options)
  }
  static fromText(text, options) {
    const data = new TextEncoder().encode(text)
    return StreamableFile.fromBytes(data, {
      contentType: 'text/plain; charset=utf-8',
      ...options,
    })
  }
}
