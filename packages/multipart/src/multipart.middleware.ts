import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RouteCtx } from '@banhmi/common'
import type { MultipartOptions, UploadedFileMeta } from './types'

/** @internal State key for the parsed multipart files map. */
export const MULTIPART_FILES_KEY = 'banhmi:multipart:files'
/** @internal State key for a multipart parse error. */
export const MULTIPART_ERROR_KEY = 'banhmi:multipart:error'

/**
 * Parse all multipart files from `ctx.request.formData()` and store the
 * resulting `UploadedFileMeta` array on `ctx.state` keyed by field name.
 *
 * Limits (fileSize, files, fields) are enforced during parsing. Any violation
 * stores an error object on `ctx.state[MULTIPART_ERROR_KEY]` and the
 * decorators return that error as an HTTP response.
 *
 * Results are cached on the state so multiple parameter decorators on the
 * same handler share one `formData()` call.
 *
 * @internal
 */
export async function parseMultipart(
  ctx: RouteCtx,
  opts: MultipartOptions,
): Promise<void> {
  // Already parsed — reuse cached result.
  if (MULTIPART_FILES_KEY in ctx.state || MULTIPART_ERROR_KEY in ctx.state) {
    return
  }

  const contentType = ctx.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    ctx.state[MULTIPART_ERROR_KEY] = {
      status: 400,
      message: 'Expected multipart/form-data content-type',
    }
    return
  }

  const maxFileSize = opts.fileSize ?? 5_000_000
  const maxFiles = opts.files ?? 10
  const maxFields = opts.fields ?? 100

  let formData: FormData
  try {
    formData = await ctx.formData()
  } catch {
    ctx.state[MULTIPART_ERROR_KEY] = {
      status: 400,
      message: 'Failed to parse multipart body',
    }
    return
  }

  const filesByField: Record<string, UploadedFileMeta[]> = {}
  let fileCount = 0
  let fieldCount = 0

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      fileCount++
      if (fileCount > maxFiles) {
        ctx.state[MULTIPART_ERROR_KEY] = {
          status: 413,
          message: `Too many files: limit is ${maxFiles}`,
        }
        return
      }

      const arrayBuffer = await value.arrayBuffer()
      const size = arrayBuffer.byteLength

      if (size > maxFileSize) {
        ctx.state[MULTIPART_ERROR_KEY] = {
          status: 413,
          message: `File "${value.name}" exceeds size limit of ${maxFileSize} bytes`,
        }
        return
      }

      const buffer = Buffer.from(arrayBuffer)
      const meta: UploadedFileMeta = {
        fieldname: key,
        filename: value.name,
        mimetype: value.type || 'application/octet-stream',
        size,
        buffer,
      }

      if (opts.dest) {
        await mkdir(opts.dest, { recursive: true })
        const safeName = `${crypto.randomUUID()}-${value.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const filePath = join(opts.dest, safeName)
        await writeFile(filePath, buffer)
        meta.path = filePath
        meta.buffer = undefined
      }

      if (!filesByField[key]) {
        filesByField[key] = []
      }
      filesByField[key].push(meta)
    } else {
      fieldCount++
      if (fieldCount > maxFields) {
        ctx.state[MULTIPART_ERROR_KEY] = {
          status: 400,
          message: `Too many fields: limit is ${maxFields}`,
        }
        return
      }
    }
  }

  ctx.state[MULTIPART_FILES_KEY] = filesByField
}

/**
 * Retrieve a parsed multipart error from `ctx.state`, if any.
 *
 * @internal
 */
export function getMultipartError(
  ctx: RouteCtx,
): { status: number; message: string } | undefined {
  return ctx.state[MULTIPART_ERROR_KEY] as
    | { status: number; message: string }
    | undefined
}

/**
 * Retrieve parsed file metadata for a single named field.
 *
 * Returns `undefined` if the field was not present.
 *
 * @internal
 */
export function getUploadedFile(
  ctx: RouteCtx,
  fieldname: string,
): UploadedFileMeta | undefined {
  const files = ctx.state[MULTIPART_FILES_KEY] as
    | Record<string, UploadedFileMeta[]>
    | undefined
  return files?.[fieldname]?.[0]
}

/**
 * Retrieve all parsed file metadata as a flat array.
 *
 * @internal
 */
export function getAllUploadedFiles(ctx: RouteCtx): UploadedFileMeta[] {
  const files = ctx.state[MULTIPART_FILES_KEY] as
    | Record<string, UploadedFileMeta[]>
    | undefined
  if (!files) return []
  return Object.values(files).flat()
}
