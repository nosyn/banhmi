import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { IsNumber, IsString, validate } from 'class-validator'

/**
 * Ten-field DTO for the validation scenario.
 * Uses class-validator decorators for field validation.
 */
class TenFieldDto {
  @IsString()
  f1: string = ''
  @IsString()
  f2: string = ''
  @IsString()
  f3: string = ''
  @IsString()
  f4: string = ''
  @IsString()
  f5: string = ''
  @IsNumber()
  n1: number = 0
  @IsNumber()
  n2: number = 0
  @IsNumber()
  n3: number = 0
  @IsNumber()
  n4: number = 0
  @IsNumber()
  n5: number = 0
}

/**
 * Controller exposing json-roundtrip, validation, and file-upload endpoints
 * for benchmark comparison with Banhmi.
 */
@Controller()
export class BodyController {
  /** Echo the JSON request body back to the caller. */
  @Post('/json')
  @HttpCode(200)
  echo(@Body() body: unknown) {
    return body
  }

  /** Validate a ten-field DTO with class-validator and respond `{ ok: true }`. */
  @Post('/validate')
  @HttpCode(200)
  async validateBody(@Body() raw: Record<string, unknown>) {
    const dto = Object.assign(new TenFieldDto(), raw)
    const errors = await validate(dto)
    if (errors.length > 0) {
      return { ok: false, errors: errors.map((e) => e.toString()) }
    }
    return { ok: true }
  }

  /** Accept a multipart file upload and respond with its size and MIME type. */
  @Post('/upload')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile()
    file: { mimetype: string; size: number } | undefined,
  ) {
    return { mimetype: file?.mimetype ?? null, size: file?.size ?? 0 }
  }
}
