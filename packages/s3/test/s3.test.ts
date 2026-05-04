import { describe, expect, mock, test } from 'bun:test'
import { Module } from '@banhmi/common'
import { BanhmiFactory } from '@banhmi/platform-bun'
import type { S3Client } from 'bun'
import { S3Module } from '../src/s3.module'
import { S3Service } from '../src/s3.service'
import { S3_TOKEN } from '../src/tokens'

describe('S3Module.forRoot', () => {
  test('registers an S3Client as S3_TOKEN', async () => {
    @Module({
      imports: [S3Module.forRoot({ bucket: 'test', region: 'us-east-1' })],
    })
    class AppModule {}

    const app = await BanhmiFactory.create(AppModule)
    const client = app.container.resolve(S3_TOKEN) as S3Client
    expect(client).toBeDefined()
    expect(typeof (client as { file: unknown }).file).toBe('function')
    await app.close()
  })
})

describe('S3Service', () => {
  function makeMockClient() {
    const mockFile = {
      write: mock(async (_data: unknown) => 10),
      arrayBuffer: mock(async () => new ArrayBuffer(5)),
      presign: mock(
        (_opts: { expiresIn?: number }) =>
          `https://s3.example.com/key?exp=${_opts.expiresIn}`,
      ),
      delete: mock(async () => {}),
    }
    const mockClient = {
      file: mock((_key: string) => mockFile),
    }
    return { mockClient, mockFile }
  }

  test('upload writes data and returns bytes written', async () => {
    const { mockClient, mockFile } = makeMockClient()
    const svc = new S3Service(mockClient as unknown as S3Client)
    const result = await svc.upload('uploads/test.txt', 'hello world')
    expect(result).toBe(10)
    expect(mockClient.file).toHaveBeenCalledWith('uploads/test.txt')
    expect(mockFile.write).toHaveBeenCalledWith('hello world')
  })

  test('download returns a Blob', async () => {
    const { mockClient } = makeMockClient()
    const svc = new S3Service(mockClient as unknown as S3Client)
    const result = await svc.download('files/photo.jpg')
    expect(result).toBeInstanceOf(Blob)
  })

  test('presign returns a presigned URL string', async () => {
    const { mockClient } = makeMockClient()
    const svc = new S3Service(mockClient as unknown as S3Client)
    const url = svc.presign('reports/q4.pdf', 3600)
    expect(typeof url).toBe('string')
    expect(url).toContain('3600')
  })

  test('delete calls file.delete()', async () => {
    const { mockClient, mockFile } = makeMockClient()
    const svc = new S3Service(mockClient as unknown as S3Client)
    await svc.delete('old/file.zip')
    expect(mockFile.delete).toHaveBeenCalled()
  })
})
