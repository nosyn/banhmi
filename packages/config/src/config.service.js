import { Injectable } from '@banhmi/common'
@Injectable()
export class ConfigService {
  config
  constructor(schema, env = Bun.env) {
    const result = {}
    const missing = []
    for (const [key, field] of Object.entries(schema)) {
      const raw = env[key]
      if (raw === undefined || raw === '') {
        if ('default' in field && field.default !== undefined) {
          result[key] = field.default
        } else {
          missing.push(key)
        }
        continue
      }
      if (field.type === 'number') {
        const n = Number(raw)
        if (Number.isNaN(n))
          throw new Error(`Config: ${key} must be a number, got "${raw}"`)
        result[key] = n
      } else if (field.type === 'boolean') {
        result[key] = raw === 'true' || raw === '1'
      } else {
        result[key] = raw
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Config: missing required env vars: ${missing.join(', ')}`,
      )
    }
    this.config = result
  }
  get(key) {
    return this.config[key]
  }
  getOrThrow(key) {
    const val = this.config[key]
    if (val === undefined || val === null) {
      throw new Error(`Config: ${String(key)} is not defined`)
    }
    return val
  }
}
