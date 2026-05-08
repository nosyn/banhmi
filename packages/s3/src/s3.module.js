import { Module } from '@banhmi/common'
import { S3_TOKEN } from './tokens'
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class S3Module {
  static forRoot(config) {
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
