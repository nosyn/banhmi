import type { Database } from 'bun:sqlite'
import { Token } from '@banhmi/common'

export const DATABASE_TOKEN = Token<Database>('Database')
