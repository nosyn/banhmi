# @banhmi/sqlite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `@banhmi/sqlite` package that wraps Bun's native `bun:sqlite` with a NestJS-style module, injectable token, and active-record repository.

**Architecture:** `SqliteModule.forRoot(path, opts?)` creates an inner class with `@Module` applied at definition time (since TC39 decorators run at class evaluation time). `@InjectDatabase()` is a shorthand for `@Inject(DATABASE_TOKEN)`. `@Repository(Entity)` uses Bun's `.as(EntityClass)` for type-safe row mapping. No ORM — thin wrapper over native `bun:sqlite`.

**Tech Stack:** `bun:sqlite` (native, zero deps), TC39 Stage 3 decorators, `Symbol.metadata`, Bun test runner

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/sqlite/package.json` | Package manifest — `@banhmi/sqlite`, `"type": "module"` |
| `packages/sqlite/tsconfig.json` | Extends root tsconfig |
| `packages/sqlite/bunfig.toml` | Preloads `Symbol.metadata` polyfill |
| `packages/sqlite/src/tokens.ts` | `DATABASE_TOKEN` singleton |
| `packages/sqlite/src/sqlite.module.ts` | `SqliteModule.forRoot(path, opts?)` |
| `packages/sqlite/src/inject-database.ts` | `@InjectDatabase()` shorthand |
| `packages/sqlite/src/repository.ts` | `@Repository(Entity)` decorator + `BaseRepository<T>` |
| `packages/sqlite/src/index.ts` | Re-exports all public API |
| `packages/sqlite/test/sqlite.test.ts` | Unit + integration tests |
| `packages/banhmi/src/index.ts` | Add `export * from '@banhmi/sqlite'` |
| `packages/banhmi/package.json` | Add `"@banhmi/sqlite": "workspace:*"` |

---

### Task 1: Package scaffold

**Files:**
- Create: `packages/sqlite/package.json`
- Create: `packages/sqlite/tsconfig.json`
- Create: `packages/sqlite/bunfig.toml`

- [ ] **Step 1: Create `packages/sqlite/package.json`**

```json
{
  "name": "@banhmi/sqlite",
  "version": "0.3.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@banhmi/common": "workspace:*",
    "@banhmi/core": "workspace:*"
  }
}
```

- [ ] **Step 2: Create `packages/sqlite/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `packages/sqlite/bunfig.toml`**

```toml
[test]
preload = ["../common/src/polyfill-symbol-metadata.ts"]
```

- [ ] **Step 4: Verify polyfill path exists**

```bash
ls packages/common/src/polyfill-symbol-metadata.ts
```
Expected: file exists.

- [ ] **Step 5: Commit scaffold**

```bash
git add packages/sqlite/
git commit -m "chore(sqlite): scaffold @banhmi/sqlite package"
```

---

### Task 2: Token and basic module

**Files:**
- Create: `packages/sqlite/src/tokens.ts`
- Create: `packages/sqlite/src/sqlite.module.ts`
- Create: `packages/sqlite/src/index.ts`
- Create: `packages/sqlite/test/sqlite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/sqlite/test/sqlite.test.ts`:

```ts
import { describe, expect, test, afterEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { BanhmiFactory } from '@banhmi/platform-bun'
import { Module } from '@banhmi/common'
import { SqliteModule } from '../src/sqlite.module'
import { DATABASE_TOKEN } from '../src/tokens'

describe('SqliteModule.forRoot', () => {
  let app: Awaited<ReturnType<typeof BanhmiFactory.create>> | null = null

  afterEach(async () => {
    await app?.close()
    app = null
  })

  test('registers a Database instance as DATABASE_TOKEN', async () => {
    @Module({ imports: [SqliteModule.forRoot(':memory:')] })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const db = app.get(DATABASE_TOKEN) as Database
    expect(db).toBeInstanceOf(Database)
  })

  test('enables WAL mode by default', async () => {
    @Module({ imports: [SqliteModule.forRoot(':memory:')] })
    class AppModule {}

    app = await BanhmiFactory.create(AppModule)
    const db = app.get(DATABASE_TOKEN) as Database
    const result = db.query<{ journal_mode: string }, []>('PRAGMA journal_mode').get()
    expect(result?.journal_mode).toBe('wal')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/sqlite && bun test test/sqlite.test.ts
```
Expected: FAIL — `SqliteModule` not found.

- [ ] **Step 3: Create `packages/sqlite/src/tokens.ts`**

```ts
import { Token } from '@banhmi/common'
import type { Database } from 'bun:sqlite'

export const DATABASE_TOKEN = Token<Database>('Database')
```

- [ ] **Step 4: Create `packages/sqlite/src/sqlite.module.ts`**

```ts
import { Module } from '@banhmi/common'
import { DATABASE_TOKEN } from './tokens'

export interface SqliteModuleOptions {
  readonly?: boolean
  create?: boolean
  readwrite?: boolean
}

export class SqliteModule {
  static forRoot(path: string, opts?: SqliteModuleOptions) {
    @Module({
      providers: [
        {
          provide: DATABASE_TOKEN,
          useFactory: async () => {
            const { Database } = await import('bun:sqlite')
            const db = new Database(path, opts)
            db.exec('PRAGMA journal_mode = WAL')
            return db
          },
        },
      ],
      exports: [DATABASE_TOKEN],
    })
    class SqliteRootModule {}

    return SqliteRootModule
  }
}
```

- [ ] **Step 5: Create `packages/sqlite/src/index.ts`**

```ts
export { SqliteModule } from './sqlite.module'
export { DATABASE_TOKEN } from './tokens'
export { InjectDatabase } from './inject-database'
export { Repository, BaseRepository } from './repository'
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd packages/sqlite && bun test test/sqlite.test.ts
```
Expected: 2 tests passing.

- [ ] **Step 7: Commit**

```bash
git add packages/sqlite/src/tokens.ts packages/sqlite/src/sqlite.module.ts packages/sqlite/src/index.ts packages/sqlite/test/sqlite.test.ts
git commit -m "feat(sqlite): add SqliteModule.forRoot with WAL mode"
```

---

### Task 3: `@InjectDatabase()` shorthand

**Files:**
- Create: `packages/sqlite/src/inject-database.ts`

- [ ] **Step 1: Write the failing test** (add to `packages/sqlite/test/sqlite.test.ts`)

```ts
import { Injectable } from '@banhmi/common'
import { InjectDatabase } from '../src/inject-database'

describe('@InjectDatabase', () => {
  test('injects Database using DATABASE_TOKEN', async () => {
    @Injectable()
    class UserService {
      static inject = [DATABASE_TOKEN] as const
      constructor(public readonly db: Database) {}
    }

    @Module({
      imports: [SqliteModule.forRoot(':memory:')],
      providers: [UserService],
    })
    class AppModule {}

    const app = await BanhmiFactory.create(AppModule)
    const svc = app.get(UserService) as UserService
    expect(svc.db).toBeInstanceOf(Database)
    await app.close()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/sqlite && bun test test/sqlite.test.ts
```
Expected: FAIL — `InjectDatabase` not found.

- [ ] **Step 3: Create `packages/sqlite/src/inject-database.ts`**

```ts
import { DATABASE_TOKEN } from './tokens'

export function InjectDatabase() {
  return (_target: unknown, _context: ClassFieldDecoratorContext): void => {
    // Marker only — DI resolution uses DATABASE_TOKEN via static inject
  }
}

// Convenience re-export so consumers can do: static inject = [DATABASE_TOKEN]
export { DATABASE_TOKEN as INJECT_DATABASE }
```

Note: In banhmi's static-inject DI, `@InjectDatabase()` is documented sugar but the actual injection wiring is done via `static inject = [DATABASE_TOKEN]`. The decorator is a no-op marker for documentation purposes. Consumers must still declare `static inject = [DATABASE_TOKEN]`.

- [ ] **Step 4: Run tests**

```bash
cd packages/sqlite && bun test test/sqlite.test.ts
```
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add packages/sqlite/src/inject-database.ts packages/sqlite/test/sqlite.test.ts
git commit -m "feat(sqlite): add @InjectDatabase convenience token"
```

---

### Task 4: `@Repository(Entity)` and `BaseRepository<T>`

**Files:**
- Create: `packages/sqlite/src/repository.ts`

- [ ] **Step 1: Write the failing tests** (add to `packages/sqlite/test/sqlite.test.ts`)

```ts
import { Repository, BaseRepository } from '../src/repository'

describe('@Repository + BaseRepository', () => {
  test('findAll returns typed rows', () => {
    class User {
      id!: number
      name!: string
    }

    @Repository(User)
    class UserRepository extends BaseRepository<User> {
      readonly tableName = 'users'
    }

    const db = new Database(':memory:')
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')
    db.exec("INSERT INTO users (name) VALUES ('Alice'), ('Bob')")

    const repo = new UserRepository(db)
    const users = repo.findAll()

    expect(users).toHaveLength(2)
    expect(users[0]).toBeInstanceOf(User)
    expect(users[0]?.name).toBe('Alice')
  })

  test('findById returns single typed row or null', () => {
    class Post {
      id!: number
      title!: string
    }

    @Repository(Post)
    class PostRepository extends BaseRepository<Post> {
      readonly tableName = 'posts'
    }

    const db = new Database(':memory:')
    db.exec('CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL)')
    db.exec("INSERT INTO posts (title) VALUES ('Hello World')")

    const repo = new PostRepository(db)
    const post = repo.findById(1)
    expect(post).toBeInstanceOf(Post)
    expect(post?.title).toBe('Hello World')

    const missing = repo.findById(999)
    expect(missing).toBeNull()
  })

  test('save inserts a new row and returns the id', () => {
    class Tag {
      id!: number
      label!: string
    }

    @Repository(Tag)
    class TagRepository extends BaseRepository<Tag> {
      readonly tableName = 'tags'
    }

    const db = new Database(':memory:')
    db.exec('CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL)')

    const repo = new TagRepository(db)
    const id = repo.save({ label: 'bun' })
    expect(typeof id).toBe('number')

    const found = repo.findById(id)
    expect(found?.label).toBe('bun')
  })

  test('delete removes a row by id', () => {
    class Category {
      id!: number
      name!: string
    }

    @Repository(Category)
    class CategoryRepository extends BaseRepository<Category> {
      readonly tableName = 'categories'
    }

    const db = new Database(':memory:')
    db.exec('CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')
    db.exec("INSERT INTO categories (name) VALUES ('Test')")

    const repo = new CategoryRepository(db)
    repo.delete(1)
    expect(repo.findById(1)).toBeNull()
  })

  test('transaction commits on success', () => {
    class Item {
      id!: number
      name!: string
    }

    @Repository(Item)
    class ItemRepository extends BaseRepository<Item> {
      readonly tableName = 'items'
    }

    const db = new Database(':memory:')
    db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)')

    const repo = new ItemRepository(db)
    repo.transaction(() => {
      repo.save({ name: 'a' })
      repo.save({ name: 'b' })
    })

    expect(repo.findAll()).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/sqlite && bun test test/sqlite.test.ts
```
Expected: FAIL — `Repository`, `BaseRepository` not found.

- [ ] **Step 3: Create `packages/sqlite/src/repository.ts`**

```ts
import type { Database } from 'bun:sqlite'

export function Repository(_entity: new () => unknown) {
  return (_target: unknown, _context: ClassDecoratorContext): void => {
    // Marker decorator — BaseRepository reads tableName from instance
  }
}

export abstract class BaseRepository<T extends object> {
  abstract readonly tableName: string

  constructor(protected readonly db: Database) {}

  findAll(): T[] {
    const Entity = this.entityClass()
    return this.db
      .query<T, []>(`SELECT * FROM ${this.tableName}`)
      .as(Entity)
      .all()
  }

  findById(id: number): T | null {
    const Entity = this.entityClass()
    return (
      this.db
        .query<T, [number]>(`SELECT * FROM ${this.tableName} WHERE id = ?`)
        .as(Entity)
        .get(id) ?? null
    )
  }

  save(data: Omit<T, 'id'>): number {
    const keys = Object.keys(data as object)
    const placeholders = keys.map(() => '?').join(', ')
    const values = Object.values(data as object)
    const stmt = this.db.query<{ id: number }, unknown[]>(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    )
    const result = stmt.get(...values)
    return result?.id ?? 0
  }

  delete(id: number): void {
    this.db
      .query<void, [number]>(`DELETE FROM ${this.tableName} WHERE id = ?`)
      .run(id)
  }

  transaction<R>(fn: () => R): R {
    return this.db.transaction(fn)()
  }

  private entityClass(): new () => T {
    // BaseRepository subclasses are decorated with @Repository(Entity)
    // The entity class isn't stored on the metadata — subclasses must return it.
    // This default implementation returns a plain object constructor.
    // Subclasses that need typed instances should override findAll/findById.
    return Object as unknown as new () => T
  }
}
```

Note: `bun:sqlite`'s `.as(Class)` requires that the class is passed at query time. `BaseRepository` stores the entity constructor via the decorator. To do this properly, refactor to pass entity class through the decorator and store it:

```ts
// Revised repository.ts (complete replacement):
import type { Database } from 'bun:sqlite'

const REPO_ENTITY = Symbol('banhmi:sqlite:repo_entity')

export function Repository(entity: new () => unknown) {
  return (
    _target: unknown,
    context: ClassDecoratorContext,
  ): void => {
    context.metadata[REPO_ENTITY] = entity
  }
}

export abstract class BaseRepository<T extends object> {
  abstract readonly tableName: string

  constructor(protected readonly db: Database) {}

  private get Entity(): new () => T {
    const meta = (
      this.constructor as unknown as { [Symbol.metadata]?: Record<symbol, unknown> }
    )[Symbol.metadata]
    return (meta?.[REPO_ENTITY] as new () => T | undefined) ?? (Object as unknown as new () => T)
  }

  findAll(): T[] {
    return this.db
      .query<T, []>(`SELECT * FROM ${this.tableName}`)
      .as(this.Entity)
      .all()
  }

  findById(id: number): T | null {
    return (
      this.db
        .query<T, [number]>(`SELECT * FROM ${this.tableName} WHERE id = ?`)
        .as(this.Entity)
        .get(id) ?? null
    )
  }

  save(data: Omit<T, 'id'>): number {
    const keys = Object.keys(data as Record<string, unknown>)
    const placeholders = keys.map(() => '?').join(', ')
    const values = Object.values(data as Record<string, unknown>)
    const result = this.db
      .query<{ id: number }, unknown[]>(
        `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      )
      .get(...values)
    return result?.id ?? 0
  }

  delete(id: number): void {
    this.db
      .query<void, [number]>(`DELETE FROM ${this.tableName} WHERE id = ?`)
      .run(id)
  }

  transaction<R>(fn: () => R): R {
    return this.db.transaction(fn)()
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd packages/sqlite && bun test test/sqlite.test.ts
```
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add packages/sqlite/src/repository.ts packages/sqlite/test/sqlite.test.ts
git commit -m "feat(sqlite): add @Repository decorator and BaseRepository active-record class"
```

---

### Task 5: Wire into banhmi facade + install

**Files:**
- Modify: `packages/banhmi/src/index.ts`
- Modify: `packages/banhmi/package.json`

- [ ] **Step 1: Read current banhmi index**

```bash
cat packages/banhmi/src/index.ts
```

- [ ] **Step 2: Add export to `packages/banhmi/src/index.ts`**

```ts
export * from '@banhmi/sqlite'
```

- [ ] **Step 3: Add dependency to `packages/banhmi/package.json`**

In the `dependencies` object, add:
```json
"@banhmi/sqlite": "workspace:*"
```

- [ ] **Step 4: Install dependencies**

```bash
bun install
```

- [ ] **Step 5: Run full test suite**

```bash
bun test --recursive
```
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add packages/banhmi/src/index.ts packages/banhmi/package.json bun.lock
git commit -m "feat(banhmi): export @banhmi/sqlite from facade package"
```
