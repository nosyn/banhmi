# Drizzle ORM Integration Example Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `drizzle-api` example app demonstrating first-class Drizzle ORM integration with banhmi using `bun:sqlite` — Token-based DI for the db instance, relational schema (`users` + `posts`), full CRUD via Drizzle query builder, and schema push via `drizzle-kit`.

**Architecture:** Drizzle's `BunSQLiteDatabase` instance is provided through banhmi's `Token<T>` DI system via a `DatabaseModule`. Services inject the typed db client and use Drizzle's query API. Controllers stay thin. Schema and relations live in one file. `drizzle-kit push` syncs schema to SQLite without manual migration files during development.

**Tech Stack:** `drizzle-orm` + `drizzle-kit`, `bun:sqlite`, static `inject` DI, TC39 Stage 3 decorators.

---

## File Structure

```
examples/drizzle-api/
  drizzle.config.ts              # drizzle-kit config (schema path, DB url, dialect)
  package.json
  bunfig.toml
  src/
    database/
      schema.ts                  # users + posts table defs + relations
      database.module.ts         # provides DB_TOKEN via FactoryProvider
    users/
      users.service.ts           # CRUD via drizzle query builder
      users.controller.ts        # HTTP handlers delegating to UsersService
    posts/
      posts.service.ts           # list posts with user relation
      posts.controller.ts        # GET /posts, GET /posts/:id
    app.module.ts                # root module
    main.ts                      # entry point
```

---

## Task 1: Project scaffold, dependencies, and Drizzle config

**Files:**
- Create: `examples/drizzle-api/package.json`
- Create: `examples/drizzle-api/bunfig.toml`
- Create: `examples/drizzle-api/drizzle.config.ts`

- [ ] **Step 1: Create `examples/drizzle-api/package.json`**

```json
{
  "name": "drizzle-api-example",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/main.ts",
    "db:push": "bunx drizzle-kit push",
    "db:studio": "bunx drizzle-kit studio"
  },
  "dependencies": {
    "banhmi": "workspace:*",
    "drizzle-orm": "^0.44.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0"
  }
}
```

- [ ] **Step 2: Create `examples/drizzle-api/bunfig.toml`**

```toml
[test]
preload = ["../../packages/common/src/polyfill-symbol-metadata.ts"]
```

- [ ] **Step 3: Create `examples/drizzle-api/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './drizzle-api.sqlite',
  },
})
```

- [ ] **Step 4: Install dependencies**

Run from the repo root so the workspace lockfile is updated:

```bash
bun install
```

Expected: `drizzle-orm` and `drizzle-kit` resolved and linked into `examples/drizzle-api/`.

- [ ] **Step 5: Create `.gitignore` for the example**

Create `examples/drizzle-api/.gitignore`:

```
drizzle-api.sqlite
drizzle-api.sqlite-shm
drizzle-api.sqlite-wal
```

- [ ] **Step 6: Commit**

```bash
git add examples/drizzle-api/package.json \
        examples/drizzle-api/bunfig.toml \
        examples/drizzle-api/drizzle.config.ts \
        examples/drizzle-api/.gitignore \
        bun.lock
git commit -m "chore(drizzle-api): scaffold example with drizzle-orm dependency"
```

---

## Task 2: Schema, relations, and `DatabaseModule`

**Files:**
- Create: `examples/drizzle-api/src/database/schema.ts`
- Create: `examples/drizzle-api/src/database/database.module.ts`

- [ ] **Step 1: Create `examples/drizzle-api/src/database/schema.ts`**

```ts
import { relations } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
```

- [ ] **Step 2: Create `examples/drizzle-api/src/database/database.module.ts`**

```ts
import { Module, Token } from 'banhmi'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

export const DB_TOKEN = Token<DrizzleDB>('DrizzleDB')

@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useFactory: (): DrizzleDB => {
        const sqlite = new Database('./drizzle-api.sqlite')
        return drizzle({ client: sqlite, schema })
      },
    },
  ],
  exports: [DB_TOKEN],
})
export class DatabaseModule {}
```

- [ ] **Step 3: Push schema to the SQLite database**

```bash
cd examples/drizzle-api && bunx drizzle-kit push
```

Expected: Creates `drizzle-api.sqlite` with `users` and `posts` tables. Output like:
```
[✓] Changes applied
```

- [ ] **Step 4: Commit**

```bash
git add examples/drizzle-api/src/database/schema.ts \
        examples/drizzle-api/src/database/database.module.ts
git commit -m "feat(drizzle-api): add schema and DatabaseModule with DB_TOKEN"
```

---

## Task 3: `UsersService`, `UsersController`, `PostsService`, `PostsController`

**Files:**
- Create: `examples/drizzle-api/src/users/users.service.ts`
- Create: `examples/drizzle-api/src/users/users.controller.ts`
- Create: `examples/drizzle-api/src/posts/posts.service.ts`
- Create: `examples/drizzle-api/src/posts/posts.controller.ts`
- Create: `examples/drizzle-api/src/app.module.ts`
- Create: `examples/drizzle-api/src/main.ts`

- [ ] **Step 1: Create `examples/drizzle-api/src/users/users.service.ts`**

```ts
import { Injectable, NotFoundException } from 'banhmi'
import { eq } from 'drizzle-orm'
import type { DrizzleDB } from '../database/database.module'
import { DB_TOKEN } from '../database/database.module'
import { posts, users } from '../database/schema'

@Injectable()
export class UsersService {
  static inject = [DB_TOKEN] as const

  constructor(private db: DrizzleDB) {}

  findAll() {
    return this.db.select().from(users).all()
  }

  findById(id: number) {
    const user = this.db.select().from(users).where(eq(users.id, id)).get()
    if (!user) throw new NotFoundException(`User #${id} not found`)
    return user
  }

  findWithPosts(id: number) {
    const result = this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: { posts: true },
    })
    if (!result) throw new NotFoundException(`User #${id} not found`)
    return result
  }

  create(name: string, email: string) {
    return this.db.insert(users).values({ name, email }).returning().get()
  }

  delete(id: number): void {
    this.findById(id)
    this.db.delete(users).where(eq(users.id, id)).run()
  }
}
```

- [ ] **Step 2: Create `examples/drizzle-api/src/users/users.controller.ts`**

```ts
import { Controller, Delete, Get, HttpCode, Post } from 'banhmi'
import type { RouteCtx } from 'banhmi'
import { UsersService } from './users.service'

@Controller('/users')
export class UsersController {
  static inject = [UsersService] as const

  constructor(private users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.users.findById(Number(ctx.params.id))
  }

  @Get('/:id/posts')
  findWithPosts(ctx: RouteCtx) {
    return this.users.findWithPosts(Number(ctx.params.id))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const { name, email } = await ctx.json<{ name: string; email: string }>()
    return this.users.create(name, email)
  }

  @Delete('/:id')
  @HttpCode(204)
  remove(ctx: RouteCtx) {
    this.users.delete(Number(ctx.params.id))
  }
}
```

- [ ] **Step 3: Create `examples/drizzle-api/src/posts/posts.service.ts`**

```ts
import { Injectable, NotFoundException } from 'banhmi'
import { eq } from 'drizzle-orm'
import type { DrizzleDB } from '../database/database.module'
import { DB_TOKEN } from '../database/database.module'
import { posts } from '../database/schema'

@Injectable()
export class PostsService {
  static inject = [DB_TOKEN] as const

  constructor(private db: DrizzleDB) {}

  findAll() {
    return this.db.query.posts.findMany({ with: { author: true } })
  }

  findById(id: number) {
    const post = this.db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: { author: true },
    })
    if (!post) throw new NotFoundException(`Post #${id} not found`)
    return post
  }

  create(title: string, body: string, authorId: number) {
    return this.db.insert(posts).values({ title, body, authorId }).returning().get()
  }
}
```

- [ ] **Step 4: Create `examples/drizzle-api/src/posts/posts.controller.ts`**

```ts
import { Controller, Get, HttpCode, Post } from 'banhmi'
import type { RouteCtx } from 'banhmi'
import { PostsService } from './posts.service'

@Controller('/posts')
export class PostsController {
  static inject = [PostsService] as const

  constructor(private posts: PostsService) {}

  @Get()
  findAll() {
    return this.posts.findAll()
  }

  @Get('/:id')
  findOne(ctx: RouteCtx) {
    return this.posts.findById(Number(ctx.params.id))
  }

  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const { title, body, authorId } = await ctx.json<{
      title: string
      body: string
      authorId: number
    }>()
    return this.posts.create(title, body, authorId)
  }
}
```

- [ ] **Step 5: Create `examples/drizzle-api/src/app.module.ts`**

```ts
import { Module } from 'banhmi'
import { DatabaseModule } from './database/database.module'
import { PostsController } from './posts/posts.controller'
import { PostsService } from './posts/posts.service'
import { UsersController } from './users/users.controller'
import { UsersService } from './users/users.service'

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController, PostsController],
  providers: [UsersService, PostsService],
})
export class AppModule {}
```

- [ ] **Step 6: Create `examples/drizzle-api/src/main.ts`**

```ts
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'

const app = await BanhmiFactory.create(AppModule)
app.enableShutdownHooks()
await app.listen(3002)

console.log('Drizzle API running on http://localhost:3002')
console.log('')
console.log('Users:  GET/POST http://localhost:3002/users')
console.log('User:   GET      http://localhost:3002/users/:id')
console.log('Posts:  GET      http://localhost:3002/users/:id/posts')
console.log('Posts:  GET/POST http://localhost:3002/posts')
```

- [ ] **Step 7: Start the dev server and verify it boots**

```bash
cd examples/drizzle-api && bun run dev
```

Expected: Server starts on port 3002 with no errors.

- [ ] **Step 8: Smoke-test all endpoints**

In a separate terminal:

```bash
# Create a user
curl -X POST http://localhost:3002/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
# Expected: {"id":1,"name":"Alice","email":"alice@example.com","createdAt":...}

# List all users
curl http://localhost:3002/users
# Expected: [{"id":1,...}]

# Get user by id
curl http://localhost:3002/users/1
# Expected: {"id":1,"name":"Alice",...}

# Get user with posts (empty posts array)
curl http://localhost:3002/users/1/posts
# Expected: {"id":1,"name":"Alice",...,"posts":[]}

# Create a post
curl -X POST http://localhost:3002/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","body":"World","authorId":1}'
# Expected: {"id":1,"title":"Hello","body":"World","authorId":1,...}

# Get all posts (with author)
curl http://localhost:3002/posts
# Expected: [{"id":1,"title":"Hello",...,"author":{"id":1,"name":"Alice",...}}]

# Get user with posts (now populated)
curl http://localhost:3002/users/1/posts
# Expected: {"id":1,...,"posts":[{"id":1,"title":"Hello",...}]}

# 404 for unknown user
curl http://localhost:3002/users/999
# Expected: {"statusCode":404,"message":"User #999 not found"}

# Delete user
curl -X DELETE http://localhost:3002/users/1
# Expected: 204 No Content
```

- [ ] **Step 9: Stop the server and commit**

```bash
git add examples/drizzle-api/src/
git commit -m "feat(drizzle-api): add users/posts CRUD with Drizzle ORM and relational queries"
```

---

## Self-Review

**Spec coverage:**
- ✅ `drizzle-orm/bun-sqlite` connection — Task 1/2
- ✅ `drizzle.config.ts` for schema push — Task 1
- ✅ `users` and `posts` schema with FK and relations — Task 2
- ✅ `DatabaseModule` with `DB_TOKEN` factory provider — Task 2
- ✅ Relational queries via `db.query.*` — Task 3
- ✅ Full CRUD for users — Task 3
- ✅ Posts with nested author — Task 3
- ✅ `GET /users/:id/posts` nested endpoint — Task 3
- ✅ `NotFoundException` on missing records — Task 3
- ✅ `drizzle-kit push` for schema sync — Task 2

**Type consistency:** `DB_TOKEN = Token<DrizzleDB>` defined in `database.module.ts` and imported in both service files. `DrizzleDB = ReturnType<typeof drizzle<typeof schema>>` computed once and re-exported. `users` and `posts` tables exported from `schema.ts` and used in both services.

**No placeholders:** All code blocks are complete.
