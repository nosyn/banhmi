import { describe, expect, test } from 'bun:test'
import {
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Post,
} from '@banhmi/common'
import { createEdgeHandler } from '../src/edge-adapter'

// ─── Domain ───────────────────────────────────────────────────────────────────

interface Cat {
  id: number
  name: string
}

@Injectable()
class CatsService {
  private store = new Map<number, Cat>([[1, { id: 1, name: 'Tom' }]])

  findAll(): Cat[] {
    return [...this.store.values()]
  }

  findOne(id: number): Cat {
    const cat = this.store.get(id)
    if (!cat) throw new NotFoundException(`Cat #${id} not found`)
    return cat
  }

  create(name: string): Cat {
    const id = this.store.size + 1
    const cat: Cat = { id, name }
    this.store.set(id, cat)
    return cat
  }
}

@Controller('/cats')
class CatsController {
  static inject = [CatsService] as const

  constructor(private svc: CatsService) {}

  @Get('/')
  findAll(): Cat[] {
    return this.svc.findAll()
  }

  @Get('/:id')
  findOne(ctx: { params: Record<string, string> }): Cat {
    return this.svc.findOne(Number(ctx.params.id))
  }

  @Post('/')
  @HttpCode(201)
  async create(ctx: { json<T>(): Promise<T> }): Promise<Cat> {
    const body = await ctx.json<{ name: string }>()
    return this.svc.create(body.name)
  }
}

@Module({ controllers: [CatsController], providers: [CatsService] })
class AppModule {}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createEdgeHandler', () => {
  test('returns a function', async () => {
    const handler = await createEdgeHandler(AppModule)
    expect(typeof handler).toBe('function')
  })

  test('GET /cats/ returns 200 with cat list', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(new Request('http://edge.test/cats/'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ id: 1, name: 'Tom' })
  })

  test('GET /cats/:id returns the correct cat', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(new Request('http://edge.test/cats/1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ id: 1, name: 'Tom' })
  })

  test('GET unknown path returns 404', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(new Request('http://edge.test/unknown'))
    expect(res.status).toBe(404)
  })

  test('POST /cats/ creates a cat and returns 201', async () => {
    const handler = await createEdgeHandler(AppModule)
    const res = await handler(
      new Request('http://edge.test/cats/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Whiskers' }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ name: 'Whiskers' })
  })

  test('handler can be called multiple times (stateless dispatch)', async () => {
    const handler = await createEdgeHandler(AppModule)
    const r1 = await handler(new Request('http://edge.test/cats/'))
    const r2 = await handler(new Request('http://edge.test/cats/'))
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
  })

  test('globalPrefix option strips prefix before routing', async () => {
    const handler = await createEdgeHandler(AppModule, { globalPrefix: 'api' })
    const res = await handler(new Request('http://edge.test/api/cats/'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
