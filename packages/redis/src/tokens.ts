import { Token } from '@banhmi/common'
import type { RedisLike } from './types'

export const REDIS_TOKEN = Token<RedisLike>('RedisClient')
