/**
 * Central configuration for the kitchen-sink app.
 *
 * All env vars have sensible in-process defaults so the app boots
 * without any environment setup.
 */
export const config = {
  port: Number(Bun.env.PORT ?? 0),
  jwtSecret: Bun.env.JWT_SECRET ?? 'kitchen-sink-dev-secret-min-32-chars!!',
  jwtExpiresIn: '1h' as const,
  cookieSecret: Bun.env.COOKIE_SECRET ?? 'kitchen-sink-cookie-secret',
  redisUrl: Bun.env.REDIS_URL ?? 'redis://localhost:6379',
  uploadsDir: Bun.env.UPLOADS_DIR ?? './uploads',
  compressionThreshold: 1024,
  throttleTtlMs: 60_000,
  throttleLimit: 5,
} as const
