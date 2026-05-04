import { Token } from '@banhmi/common'
import type { Redis } from 'ioredis'

export const REDIS_TOKEN = Token<Redis>('RedisClient')
