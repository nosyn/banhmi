/**
 * @banhmi/multipart — File upload via native `Request.formData()`.
 *
 * Use `@UploadedFile(fieldname)` or `@UploadedFiles()` as method decorators
 * on your controller handlers to parse multipart/form-data requests.
 * Register limits with `MultipartModule.forRoot()`.
 *
 * @example
 * import { MultipartModule, UploadedFile, getUploadedFileMeta } from '@banhmi/multipart'
 *
 * \@Controller()
 * class UploadController {
 *   \@Post('/upload')
 *   \@UploadedFile('file')
 *   upload(ctx: RouteCtx) {
 *     const f = getUploadedFileMeta(ctx, 'file')
 *     return { size: f?.size, mimetype: f?.mimetype }
 *   }
 * }
 *
 * \@Module({
 *   imports: [MultipartModule.forRoot({ fileSize: 5_000_000 })],
 *   controllers: [UploadController],
 * })
 * class AppModule {}
 */

export {
  getAllFiles,
  getUploadedFileMeta,
  UploadedFile,
  UploadedFiles,
} from './decorators'
export { MultipartModule } from './multipart.module'
export { MULTIPART_OPTIONS } from './tokens'
export type { MultipartOptions, UploadedFileMeta } from './types'
