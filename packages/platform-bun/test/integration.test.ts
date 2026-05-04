import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Token,
} from '@banhmi/common';
import type { RouteCtx } from '@banhmi/common';
import type { BanhmiApplication } from '@banhmi/core';
import { BanhmiFactory } from '../src/factory';

// ─── Domain ──────────────────────────────────────────────────────────────────

interface Cat {
  id: number;
  name: string;
}

const CATS_STORE_TOKEN = Token<Map<number, Cat>>('cats-store');

@Injectable()
class CatsService {
  static inject = [CATS_STORE_TOKEN] as const;

  constructor(private store: Map<number, Cat>) {}

  findAll(): Cat[] {
    return [...this.store.values()];
  }

  findById(id: number): Cat {
    const cat = this.store.get(id);
    if (!cat) throw new NotFoundException(`Cat #${id} not found`);
    return cat;
  }

  create(name: string): Cat {
    const id = this.store.size + 1;
    const cat: Cat = { id, name };
    this.store.set(id, cat);
    return cat;
  }
}

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('/cats')
class CatsController {
  static inject = [CatsService] as const;

  constructor(private cats: CatsService) {}

  @Get()
  findAll(_ctx: RouteCtx): Cat[] {
    return this.cats.findAll();
  }

  @Get('/:id')
  findOne(ctx: RouteCtx): Cat {
    return this.cats.findById(Number(ctx.params.id));
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx): Promise<Cat> {
    const { name } = await ctx.json<{ name: string }>();
    return this.cats.create(name);
  }
}

// ─── Module ──────────────────────────────────────────────────────────────────

@Module({
  controllers: [CatsController],
  providers: [
    CatsService,
    { provide: CATS_STORE_TOKEN, useValue: new Map<number, Cat>() },
  ],
})
class AppModule {}

// ─── Tests ───────────────────────────────────────────────────────────────────

let app: BanhmiApplication;
const PORT = 54321;
const BASE = `http://localhost:${PORT}`;

beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule);
  await app.listen(PORT);
});

afterAll(async () => {
  await app.close();
});

describe('GET /cats', () => {
  test('returns empty array initially', async () => {
    const res = await fetch(`${BASE}/cats`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe('POST /cats', () => {
  test('creates a cat and returns 201', async () => {
    const res = await fetch(`${BASE}/cats`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Whiskers' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Cat;
    expect(body.name).toBe('Whiskers');
    expect(body.id).toBe(1);
  });
});

describe('GET /cats/:id', () => {
  test('returns the cat by id', async () => {
    const res = await fetch(`${BASE}/cats/1`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Cat;
    expect(body.name).toBe('Whiskers');
  });

  test('returns 404 for unknown cat', async () => {
    const res = await fetch(`${BASE}/cats/999`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('not found');
  });
});

describe('404 handling', () => {
  test('unknown route returns 404', async () => {
    const res = await fetch(`${BASE}/unknown`);
    expect(res.status).toBe(404);
  });
});

describe('middleware intercepts unmatched routes', () => {
  let middlewareApp: BanhmiApplication;

  beforeAll(async () => {
    middlewareApp = await BanhmiFactory.create(AppModule);
    middlewareApp.use(async (req: Request, next: () => Promise<Response>) => {
      const url = new URL(req.url);
      if (url.pathname === '/intercept') {
        return Response.json({ intercepted: true });
      }
      return next();
    });
    await middlewareApp.listen(54399);
  });

  afterAll(async () => {
    await middlewareApp.close();
  });

  test('middleware can handle routes not in the router', async () => {
    const res = await fetch('http://localhost:54399/intercept');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ intercepted: true });
  });
});
