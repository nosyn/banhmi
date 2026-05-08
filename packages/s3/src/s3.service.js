import { Injectable } from '@banhmi/common'
import { S3_TOKEN } from './tokens'
@Injectable()
export class S3Service {
  client
  static inject = [S3_TOKEN]
  constructor(client) {
    this.client = client
  }
  async upload(key, data) {
    const file = this.client.file(key)
    return file.write(data)
  }
  async download(key) {
    const file = this.client.file(key)
    return file.arrayBuffer().then((buf) => new Blob([buf]))
  }
  presign(key, expiresIn = 3600) {
    const file = this.client.file(key)
    return file.presign({ expiresIn })
  }
  async delete(key) {
    const file = this.client.file(key)
    await file.delete()
  }
}
