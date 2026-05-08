# file-upload example

Demonstrates `@banhmi/multipart` for handling file uploads via the native
`Request.formData()` API.

## Usage

```ts
import { UploadedFile, getUploadedFileMeta } from '@banhmi/multipart'

@Controller()
class UploadController {
  @Post('/upload')
  @UploadedFile('file')
  upload(ctx: RouteCtx) {
    const f = getUploadedFileMeta(ctx, 'file')
    return { size: f?.size, mimetype: f?.mimetype }
  }
}
```

## Run

```bash
bun test examples/features/file-upload
```
