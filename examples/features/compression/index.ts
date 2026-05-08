// Demo: compress responses with @banhmi/compression using Bun.gzip.
// Register CompressionModule.forRoot() alongside a controller that returns
// a 2 KB JSON payload — clients that send Accept-Encoding: gzip receive
// a compressed response automatically.
import { CompressionModule } from '@banhmi/compression'
import { Controller, Get, Module } from 'banhmi'

// Payload large enough to exceed the default 1024-byte threshold
const LARGE_PAYLOAD = {
  message: 'Compressed by @banhmi/compression',
  data: 'A'.repeat(2048),
}

@Controller()
export class DataController {
  @Get('/data')
  getData() {
    return LARGE_PAYLOAD
  }
}

@Module({
  imports: [CompressionModule.forRoot()],
  controllers: [DataController],
})
export class AppModule {}
