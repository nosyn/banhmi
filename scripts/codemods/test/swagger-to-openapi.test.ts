import { describe, expect, it } from 'bun:test'
import { rewriteSwaggerToOpenapi } from '../rewrites/swagger-to-openapi'

describe('rewriteSwaggerToOpenapi', () => {
  it('renames ApiModelProperty to ApiProperty', () => {
    const input = `@ApiModelProperty() name: string`
    expect(rewriteSwaggerToOpenapi(input)).toContain('@ApiProperty()')
  })

  it('renames ApiModelPropertyOptional to ApiPropertyOptional', () => {
    const input = `@ApiModelPropertyOptional() name?: string`
    expect(rewriteSwaggerToOpenapi(input)).toContain('@ApiPropertyOptional()')
  })

  it('renames ApiImplicitBody to ApiBody', () => {
    const input = `@ApiImplicitBody({ type: CreateDto })`
    expect(rewriteSwaggerToOpenapi(input)).toContain('@ApiBody(')
  })

  it('renames ApiImplicitParam to ApiParam', () => {
    const input = `@ApiImplicitParam({ name: 'id' })`
    expect(rewriteSwaggerToOpenapi(input)).toContain('@ApiParam(')
  })

  it('renames ApiImplicitQuery to ApiQuery', () => {
    const input = `@ApiImplicitQuery({ name: 'limit' })`
    expect(rewriteSwaggerToOpenapi(input)).toContain('@ApiQuery(')
  })

  it('renames ApiUseTags to ApiTags', () => {
    const input = `@ApiUseTags('cats')`
    expect(rewriteSwaggerToOpenapi(input)).toContain(`@ApiTags('cats')`)
  })

  it('renames ApiImplicitHeader to ApiHeader', () => {
    const input = `@ApiImplicitHeader({ name: 'X-Custom' })`
    expect(rewriteSwaggerToOpenapi(input)).toContain('@ApiHeader(')
  })

  it('does not rename already-correct decorator names', () => {
    const input = `@ApiOperation({ summary: 'Get cat' })\n@ApiResponse({ status: 200 })`
    expect(rewriteSwaggerToOpenapi(input)).toBe(input)
  })

  it('also renames in import statements', () => {
    const input = `import { ApiModelProperty, ApiUseTags } from '@banhmi/openapi'`
    const out = rewriteSwaggerToOpenapi(input)
    expect(out).toContain('ApiProperty')
    expect(out).toContain('ApiTags')
    expect(out).not.toContain('ApiModelProperty')
    expect(out).not.toContain('ApiUseTags')
  })
})
