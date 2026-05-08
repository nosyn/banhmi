import { describe, expect, test } from 'bun:test'
import { DocumentBuilder } from '@banhmi/swagger'

describe('@banhmi/swagger shim', () => {
  test('re-exports DocumentBuilder from @banhmi/openapi', () => {
    expect(DocumentBuilder).toBeDefined()
    const doc = new DocumentBuilder().setTitle('Shim Test').setVersion('1').build()
    expect(doc.info.title).toBe('Shim Test')
  })
})
