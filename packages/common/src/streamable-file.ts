export interface StreamableFileOptions {
  contentType?: string
  disposition?: string
}

export class StreamableFile {
  readonly stream: ReadableStream
  readonly contentType?: string
  readonly disposition?: string

  constructor(stream: ReadableStream, options?: StreamableFileOptions) {
    this.stream = stream
    this.contentType = options?.contentType
    this.disposition = options?.disposition
  }

  static fromBytes(
    data: Uint8Array,
    options?: StreamableFileOptions,
  ): StreamableFile {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })
    return new StreamableFile(stream, options)
  }

  static fromText(
    text: string,
    options?: StreamableFileOptions,
  ): StreamableFile {
    const data = new TextEncoder().encode(text)
    return StreamableFile.fromBytes(data, {
      contentType: 'text/plain; charset=utf-8',
      ...options,
    })
  }
}
