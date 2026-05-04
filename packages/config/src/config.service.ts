import { Injectable } from '@banhmi/common'

export type EnvSchemaField =
  | { type: 'string'; default?: string }
  | { type: 'number'; default?: number }
  | { type: 'boolean'; default?: boolean }

export type EnvSchema = Record<string, EnvSchemaField>

type InferValue<F extends EnvSchemaField> = F extends { type: 'number' }
  ? number
  : F extends { type: 'boolean' }
    ? boolean
    : string

type InferConfig<S extends EnvSchema> = {
  [K in keyof S]: InferValue<S[K]>
}

@Injectable()
export class ConfigService<S extends EnvSchema = EnvSchema> {
  private readonly config: InferConfig<S>

  constructor(schema: S, env: Record<string, string | undefined> = Bun.env) {
    const result: Record<string, unknown> = {}
    const missing: string[] = []

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

    this.config = result as InferConfig<S>
  }

  get<K extends keyof S>(key: K): InferValue<S[K]> {
    return this.config[key]
  }

  getOrThrow<K extends keyof S>(key: K): InferValue<S[K]> {
    const val = this.config[key]
    if (val === undefined || val === null) {
      throw new Error(`Config: ${String(key)} is not defined`)
    }
    return val
  }
}
