import { InMemoryPubSub } from '@banhmi/graphql'
import type { Cat, CreateCatInput, UpdateCatInput } from './cats.types'

/**
 * In-memory cats service for the demo.
 */
export class CatsService {
  private cats: Cat[] = [
    { id: '1', name: 'Garfield', age: 8, breed: 'Persian' },
    { id: '2', name: 'Tom', age: 3 },
  ]

  private nextId = 3

  /** Shared PubSub for subscription events. */
  readonly pubsub = new InMemoryPubSub()

  findAll(): Cat[] {
    return this.cats
  }

  findById(id: string): Cat | undefined {
    return this.cats.find((c) => c.id === id)
  }

  async create(input: CreateCatInput): Promise<Cat> {
    const cat: Cat = {
      id: String(this.nextId++),
      name: input.name,
      age: input.age,
      breed: input.breed,
    }
    this.cats.push(cat)
    await this.pubsub.publish('cats.created', cat)
    return cat
  }

  async update(id: string, input: UpdateCatInput): Promise<Cat | undefined> {
    const idx = this.cats.findIndex((c) => c.id === id)
    if (idx === -1) return undefined
    const existing = this.cats[idx]
    if (!existing) return undefined

    const updated: Cat = {
      ...existing,
      name: input.name ?? existing.name,
      age: input.age ?? existing.age,
      breed: input.breed ?? existing.breed,
    }
    this.cats[idx] = updated
    await this.pubsub.publish('cats.updated', updated)
    return updated
  }

  remove(id: string): boolean {
    const idx = this.cats.findIndex((c) => c.id === id)
    if (idx === -1) return false
    this.cats.splice(idx, 1)
    return true
  }
}
