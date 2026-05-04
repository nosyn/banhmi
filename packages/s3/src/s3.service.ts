import { Injectable } from '@banhmi/common'
import type { S3Client } from 'bun'
import { S3_TOKEN } from './tokens'

@Injectable()
export class S3Service {
  static inject = [S3_TOKEN] as const

  constructor(private readonly client: S3Client) {}

  async upload(
    key: string,
    data: string | ArrayBuffer | Uint8Array | Blob,
  ): Promise<number> {
    const file = this.client.file(key)
    return file.write(data)
  }

  async download(key: string): Promise<Blob> {
    const file = this.client.file(key)
    return file.arrayBuffer().then((buf) => new Blob([buf]))
  }

  presign(key: string, expiresIn = 3600): string {
    const file = this.client.file(key)
    return file.presign({ expiresIn })
  }

  async delete(key: string): Promise<void> {
    const file = this.client.file(key)
    await file.delete()
  }
}
