import type { RouteCtx } from '@banhmi/common'
import {
  getAllUploadedFiles,
  getMultipartError,
  getUploadedFile,
  parseMultipart,
} from './multipart.middleware'
import type { MultipartOptions, UploadedFileMeta } from './types'

type Handler = (ctx: RouteCtx, ...args: unknown[]) => unknown

/**
 * Method decorator that extracts a single uploaded file from the multipart
 * request body and injects it into `ctx.state`.
 *
 * Use {@link getUploadedFileMeta} or rely on the decorator-provided context
 * to read the file data inside the handler.
 *
 * The decorator calls `request.formData()` once (result is cached) and
 * validates limits from `opts` before the handler runs. If limits are
 * exceeded, it responds with 400/413 without invoking the handler.
 *
 * @param fieldname - The multipart field name to extract.
 * @param opts - Upload limits and options. Use `MultipartModule.forRoot()`
 *   to register defaults via the {@link MULTIPART_OPTIONS} token instead.
 *
 * @example
 * \@Controller()
 * class UploadController {
 *   \@Post('/upload')
 *   \@UploadedFile('avatar')
 *   upload(ctx: RouteCtx) {
 *     const file = getUploadedFileMeta(ctx, 'avatar')
 *     return { size: file?.size }
 *   }
 * }
 */
export function UploadedFile(fieldname: string, opts: MultipartOptions = {}) {
  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      await parseMultipart(ctx, opts)

      const err = getMultipartError(ctx)
      if (err) {
        return new Response(JSON.stringify({ message: err.message }), {
          status: err.status,
          headers: { 'content-type': 'application/json' },
        })
      }

      const file = getUploadedFile(ctx, fieldname)
      // Attach file to state for the handler to retrieve
      ctx.state[`banhmi:multipart:field:${fieldname}`] = file
      return original.call(this, ctx, ...rest)
    }
  }
}

/**
 * Method decorator that extracts all uploaded files from the multipart
 * request body and injects them into `ctx.state`.
 *
 * The decorator calls `request.formData()` once (result is cached) and
 * validates limits from `opts`. If limits are exceeded, it responds with
 * 400/413 without invoking the handler.
 *
 * @param opts - Upload limits and options.
 *
 * @example
 * \@Controller()
 * class UploadController {
 *   \@Post('/upload')
 *   \@UploadedFiles()
 *   upload(ctx: RouteCtx) {
 *     const files = getAllFiles(ctx)
 *     return { count: files.length }
 *   }
 * }
 */
export function UploadedFiles(opts: MultipartOptions = {}) {
  return (
    original: Handler,
    _context: ClassMethodDecoratorContext,
  ): Handler => {
    return async function (this: unknown, ctx: RouteCtx, ...rest: unknown[]) {
      await parseMultipart(ctx, opts)

      const err = getMultipartError(ctx)
      if (err) {
        return new Response(JSON.stringify({ message: err.message }), {
          status: err.status,
          headers: { 'content-type': 'application/json' },
        })
      }

      const files = getAllUploadedFiles(ctx)
      ctx.state['banhmi:multipart:all'] = files
      return original.call(this, ctx, ...rest)
    }
  }
}

/**
 * Retrieve the metadata for a single file injected by `@UploadedFile(name)`.
 *
 * @param ctx - The route context.
 * @param fieldname - The multipart field name.
 * @returns The file metadata, or `undefined` if the field was absent.
 *
 * @example
 * const meta = getUploadedFileMeta(ctx, 'avatar')
 * console.log(meta?.filename, meta?.size)
 */
export function getUploadedFileMeta(
  ctx: RouteCtx,
  fieldname: string,
): UploadedFileMeta | undefined {
  return ctx.state[`banhmi:multipart:field:${fieldname}`] as
    | UploadedFileMeta
    | undefined
}

/**
 * Retrieve all uploaded files injected by `@UploadedFiles()`.
 *
 * @param ctx - The route context.
 * @returns Flat array of all file metadata, or empty array if none.
 *
 * @example
 * const files = getAllFiles(ctx)
 * console.log(files.map(f => f.filename))
 */
export function getAllFiles(ctx: RouteCtx): UploadedFileMeta[] {
  return (
    (ctx.state['banhmi:multipart:all'] as UploadedFileMeta[] | undefined) ?? []
  )
}
