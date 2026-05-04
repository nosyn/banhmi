import { Module } from '@banhmi/common'
import { S3_TOKEN } from './tokens'

export interface S3ModuleConfig {
  bucket?: string
  region?: string
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
}

// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class S3Module {
  static forRoot(config: S3ModuleConfig) {
    @Module({
      providers: [
        {
          provide: S3_TOKEN,
          useFactory: () => {
            const { S3Client: BunS3Client } = require('bun')
            return new BunS3Client(config)
          },
        },
      ],
      exports: [S3_TOKEN],
    })
    class S3RootModule {}

    return S3RootModule
  }
}
