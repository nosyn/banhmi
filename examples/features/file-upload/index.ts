// Demo: @banhmi/multipart — file upload with native FormData.
//
// POST /upload — accepts a multipart form with a 'file' field.
//               Responds with { size, mimetype }.
import type { RouteCtx } from '@banhmi/common'
import {
  getUploadedFileMeta,
  MultipartModule,
  UploadedFile,
} from '@banhmi/multipart'
import { Controller, Module, Post } from 'banhmi'

@Controller()
export class UploadController {
  @Post('/upload')
  @UploadedFile('file')
  upload(ctx: RouteCtx) {
    const f = getUploadedFileMeta(ctx, 'file')
    if (!f)
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
      })
    return { size: f.size, mimetype: f.mimetype }
  }
}

@Module({
  imports: [MultipartModule.forRoot({ fileSize: 5_000_000, files: 10 })],
  controllers: [UploadController],
})
export class AppModule {}
