import { Token } from '@banhmi/common'
import type { S3Client } from 'bun'

export const S3_TOKEN = Token<S3Client>('S3Client')
