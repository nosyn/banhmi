import { getUploadedFileMeta, UploadedFile } from '@banhmi/multipart'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@banhmi/openapi'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Injectable, Post } from 'banhmi'
import { config } from '../config'

/**
 * Attachments controller.
 *
 * POST /v1/tasks/:id/attachments  — accepts a multipart upload, writes the
 *   file to `./uploads/<id>/`, and responds with file metadata.
 *
 * GET  /v1/tasks/:id/attachments/:name — serves the uploaded file via
 *   `Bun.file()` (zero-copy static file response).
 */
@ApiTags('attachments')
@Controller('/v1/tasks')
@Injectable()
export class AttachmentsController {
  @ApiOperation({ summary: 'Upload a file attachment for a task' })
  @ApiParam({
    name: 'id',
    type: 'string',
    required: true,
    description: 'Task ID',
  })
  @ApiResponse({ status: 201, description: 'Upload metadata' })
  @Post('/:id/attachments')
  @UploadedFile('file')
  async upload(ctx: RouteCtx) {
    const meta = getUploadedFileMeta(ctx, 'file')
    if (!meta) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const taskId = ctx.params.id
    const uploadsDir = `${config.uploadsDir}/${taskId}`
    await Bun.write(`${uploadsDir}/${meta.filename}`, await meta.blob())

    return new Response(
      JSON.stringify({
        filename: meta.filename,
        size: meta.size,
        mimetype: meta.mimetype,
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    )
  }

  @ApiOperation({ summary: 'Serve an uploaded file' })
  @ApiParam({
    name: 'id',
    type: 'string',
    required: true,
    description: 'Task ID',
  })
  @ApiParam({
    name: 'name',
    type: 'string',
    required: true,
    description: 'Filename',
  })
  @ApiResponse({ status: 200, description: 'File contents' })
  @Get('/:id/attachments/:name')
  serve(ctx: RouteCtx) {
    const { id, name } = ctx.params
    const file = Bun.file(`${config.uploadsDir}/${id}/${name}`)
    return new Response(file)
  }
}
