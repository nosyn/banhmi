import { Injectable } from '@banhmi/common'
import { EventPattern, MessagePattern } from '@banhmi/microservices'

export interface Cat {
  id: string
  name: string
  age: number
}

export interface UserCreatedPayload {
  id: string
  email: string
}

const cats: Cat[] = [
  { id: '1', name: 'Tom', age: 3 },
  { id: '2', name: 'Whiskers', age: 5 },
]

/**
 * Handles inbound microservice messages for the cats domain.
 *
 * @example
 * // Receives cats.findOne requests and user.created events
 */
@Injectable()
export class CatsHandler {
  /**
   * Respond to a request/reply message for a single cat.
   *
   * @param id - The cat id (received as the payload).
   * @returns The matching {@link Cat} or an error object.
   *
   * @example
   * // Pattern: 'cats.findOne'
   * const cat = await client.send('cats.findOne', '1')
   */
  @MessagePattern('cats.findOne')
  findOne(id: string): Cat | { error: string } {
    const cat = cats.find((c) => c.id === id)
    if (!cat) return { error: `Cat ${id} not found` }
    return cat
  }

  /**
   * Respond to a request/reply message for all cats.
   *
   * @returns All {@link Cat} records.
   *
   * @example
   * // Pattern: 'cats.findAll'
   * const all = await client.send('cats.findAll', null)
   */
  @MessagePattern('cats.findAll')
  findAll(): Cat[] {
    return cats
  }

  /**
   * Handle a fire-and-forget user.created event.
   *
   * @param data - The {@link UserCreatedPayload}.
   *
   * @example
   * // Pattern: 'user.created'
   * await client.emit('user.created', { id: '10', email: 'x@example.com' })
   */
  @EventPattern('user.created')
  onUserCreated(data: UserCreatedPayload): void {
    console.log(`[ms-app] user.created event received: ${data.email}`)
  }
}
