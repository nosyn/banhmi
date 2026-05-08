/**
 * Configuration options for multipart file upload handling.
 *
 * @example
 * MultipartModule.forRoot({ fileSize: 10_000_000, files: 5 })
 */
export type MultipartOptions = {
  /**
   * Maximum size per file in bytes.
   *
   * @default 5_000_000
   */
  fileSize?: number
  /**
   * Maximum number of files per request.
   *
   * @default 10
   */
  files?: number
  /**
   * Maximum number of non-file fields per request.
   *
   * @default 100
   */
  fields?: number
  /**
   * If set, write each file to disk at this directory path.
   * When unset, files are held in memory as a `Buffer`.
   */
  dest?: string
}

/**
 * Metadata for a single uploaded file extracted from a multipart request.
 *
 * @example
 * const meta: UploadedFileMeta = {
 *   fieldname: 'avatar',
 *   filename: 'photo.png',
 *   mimetype: 'image/png',
 *   size: 4096,
 *   buffer: Buffer.from([...]),
 * }
 */
export type UploadedFileMeta = {
  /** Form field name. */
  fieldname: string
  /** Original filename as reported by the client. */
  filename: string
  /** MIME type as reported by the client. */
  mimetype: string
  /** Size in bytes. */
  size: number
  /** In-memory buffer (when `dest` is not set). */
  buffer?: Buffer
  /** Disk path (when `dest` is set). */
  path?: string
}
