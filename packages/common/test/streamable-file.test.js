import { describe, expect, test } from 'bun:test'
import { StreamInterceptor } from '../src/interceptors/stream.interceptor'
import { StreamableFile } from '../src/streamable-file'

describe('StreamableFile', () => {
  test('wraps a ReadableStream', () => {
    const stream = new ReadableStream()
    const file = new StreamableFile(stream)
    expect(file.stream).toBe(stream)
    expect(file.contentType).toBeUndefined()
  })
  test('accepts contentType option', () => {
    const stream = new ReadableStream()
    const file = new StreamableFile(stream, { contentType: 'application/pdf' })
    expect(file.contentType).toBe('application/pdf')
  })
  test('fromBytes wraps a Uint8Array', async () => {
    const data = new TextEncoder().encode('hello')
    const file = StreamableFile.fromBytes(data)
    expect(file.stream).toBeInstanceOf(ReadableStream)
    const text = await new Response(file.stream).text()
    expect(text).toBe('hello')
  })
  test('fromText wraps a string with text/plain content type', async () => {
    const file = StreamableFile.fromText('hello world')
    expect(file.contentType).toBe('text/plain; charset=utf-8')
    const text = await new Response(file.stream).text()
    expect(text).toBe('hello world')
  })
})
describe('StreamInterceptor', () => {
  test('transforms stream chunks', async () => {
    class UppercaseInterceptor extends StreamInterceptor {
      transform(chunk) {
        return new TextEncoder().encode(
          new TextDecoder().decode(chunk).toUpperCase(),
        )
      }
    }
    const mockHandler = {
      handle: async () => StreamableFile.fromText('hello world'),
    }
    const interceptor = new UppercaseInterceptor()
    const result = await interceptor.intercept({}, mockHandler)
    expect(result).toBeInstanceOf(StreamableFile)
    const text = await new Response(result.stream).text()
    expect(text).toBe('HELLO WORLD')
  })
  test('passes through non-StreamableFile results unchanged', async () => {
    class NoopInterceptor extends StreamInterceptor {
      transform(chunk) {
        return chunk
      }
    }
    const mockHandler = {
      handle: async () => ({ id: 1 }),
    }
    const interceptor = new NoopInterceptor()
    const result = await interceptor.intercept({}, mockHandler)
    expect(result).toEqual({ id: 1 })
  })
})
