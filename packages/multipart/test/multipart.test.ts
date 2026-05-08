import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { RouteCtx } from '@banhmi/common'
import { Controller, Module, Post } from '@banhmi/common'
import type { BanhmiApplication } from '@banhmi/core'
import { BanhmiFactory } from '@banhmi/platform-bun'
import {
  getAllFiles,
  getUploadedFileMeta,
  UploadedFile,
  UploadedFiles,
} from '../src/decorators'
import { MultipartModule } from '../src/multipart.module'

// ─── Test App ────────────────────────────────────────────────────────────────

@Controller('/upload')
class UploadController {
  @Post('/single')
  @UploadedFile('avatar')
  uploadSingle(ctx: RouteCtx) {
    const file = getUploadedFileMeta(ctx, 'avatar')
    if (!file) return { found: false }
    return {
      found: true,
      fieldname: file.fieldname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: file.buffer !== undefined,
    }
  }

  @Post('/multiple')
  @UploadedFiles()
  uploadMultiple(ctx: RouteCtx) {
    const files = getAllFiles(ctx)
    return { count: files.length, names: files.map((f) => f.filename) }
  }

  @Post('/limited')
  @UploadedFile('doc', { fileSize: 100 })
  uploadLimited(ctx: RouteCtx) {
    const file = getUploadedFileMeta(ctx, 'doc')
    return { size: file?.size }
  }

  @Post('/limited-count')
  @UploadedFiles({ files: 1 })
  uploadLimitedCount(ctx: RouteCtx) {
    const files = getAllFiles(ctx)
    return { count: files.length }
  }

  @Post('/large')
  @UploadedFile('big', { fileSize: 2_000_000 })
  uploadLarge(ctx: RouteCtx) {
    const file = getUploadedFileMeta(ctx, 'big')
    return { size: file?.size }
  }
}

@Module({
  imports: [MultipartModule.forRoot({ fileSize: 5_000_000, files: 10 })],
  controllers: [UploadController],
})
class TestAppModule {}

// ─── Server lifecycle ────────────────────────────────────────────────────────

let app: BanhmiApplication
let baseUrl: string

beforeAll(async () => {
  app = await BanhmiFactory.create(TestAppModule)
  await app.listen(0)
  baseUrl = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('@banhmi/multipart', () => {
  describe('single file upload via @UploadedFile', () => {
    test('returns correct shape for uploaded file', async () => {
      const fd = new FormData()
      fd.append(
        'avatar',
        new Blob([new Uint8Array(1024)], { type: 'image/png' }),
        'pic.png',
      )

      const res = await fetch(`${baseUrl}/upload/single`, {
        method: 'POST',
        body: fd,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.found).toBe(true)
      expect(body.fieldname).toBe('avatar')
      expect(body.filename).toBe('pic.png')
      expect(body.mimetype).toBe('image/png')
      expect(body.size).toBe(1024)
      expect(body.hasBuffer).toBe(true)
    })

    test('returns found:false when field is missing', async () => {
      const fd = new FormData()
      fd.append(
        'other',
        new Blob([new Uint8Array(128)], { type: 'image/jpeg' }),
        'other.jpg',
      )

      const res = await fetch(`${baseUrl}/upload/single`, {
        method: 'POST',
        body: fd,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.found).toBe(false)
    })

    test('file size limit triggers 413 with descriptive error', async () => {
      const fd = new FormData()
      // 200 bytes — exceeds the 100-byte limit on /limited
      fd.append(
        'doc',
        new Blob([new Uint8Array(200)], { type: 'application/pdf' }),
        'big.pdf',
      )

      const res = await fetch(`${baseUrl}/upload/limited`, {
        method: 'POST',
        body: fd,
      })
      expect(res.status).toBe(413)
      const body = await res.json()
      expect(body.message).toContain('exceeds size limit')
    })

    test('file count limit triggers 413', async () => {
      const fd = new FormData()
      fd.append(
        'file',
        new Blob([new Uint8Array(128)], { type: 'image/png' }),
        'a.png',
      )
      fd.append(
        'file',
        new Blob([new Uint8Array(128)], { type: 'image/png' }),
        'b.png',
      )

      const res = await fetch(`${baseUrl}/upload/limited-count`, {
        method: 'POST',
        body: fd,
      })
      expect(res.status).toBe(413)
      const body = await res.json()
      expect(body.message).toContain('Too many files')
    })

    test('non-multipart request returns 400', async () => {
      const res = await fetch(`${baseUrl}/upload/single`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar: 'data' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.message).toContain('multipart/form-data')
    })
  })

  describe('multiple file upload via @UploadedFiles', () => {
    test('returns all files', async () => {
      const fd = new FormData()
      fd.append(
        'photo',
        new Blob([new Uint8Array(256)], { type: 'image/png' }),
        'photo.png',
      )
      fd.append(
        'doc',
        new Blob([new Uint8Array(512)], { type: 'application/pdf' }),
        'doc.pdf',
      )

      const res = await fetch(`${baseUrl}/upload/multiple`, {
        method: 'POST',
        body: fd,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.count).toBe(2)
      expect(body.names).toContain('photo.png')
      expect(body.names).toContain('doc.pdf')
    })
  })

  describe('large file round-trip', () => {
    test('1 MB file round-trips correctly', async () => {
      const oneMb = new Uint8Array(1_000_000)
      // Fill with non-zero data to verify fidelity
      for (let i = 0; i < oneMb.length; i++) {
        oneMb[i] = i % 256
      }

      const fd = new FormData()
      fd.append(
        'big',
        new Blob([oneMb], { type: 'application/octet-stream' }),
        'data.bin',
      )

      const res = await fetch(`${baseUrl}/upload/large`, {
        method: 'POST',
        body: fd,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.size).toBe(1_000_000)
    })
  })
})
