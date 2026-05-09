import { MultipartModule } from '@banhmi/multipart'
import { Module } from 'banhmi'
import { AttachmentsController } from './attachments.controller'

/**
 * Attachments module — wires multipart parsing and static file serving.
 */
@Module({
  imports: [MultipartModule.forRoot({ fileSize: 10_000_000, files: 5 })],
  controllers: [AttachmentsController],
})
export class AttachmentsModule {}
