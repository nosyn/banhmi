import type { ProfileRecord } from '../types'

/**
 * A fixed-capacity ring buffer that stores recent {@link ProfileRecord} entries.
 *
 * When the buffer is full, the oldest entry is overwritten.
 *
 * @example
 * const recorder = new ProfileRecorder(100)
 * recorder.push({ traceId: '...', route: '/cats', ... })
 * const records = recorder.list() // most-recent first
 */
export class ProfileRecorder {
  private readonly capacity: number
  private buffer: ProfileRecord[]
  private head = 0
  private count = 0

  constructor(capacity = 100) {
    this.capacity = capacity
    this.buffer = new Array<ProfileRecord>(capacity)
  }

  /**
   * Append a profile record to the ring buffer.
   *
   * If the buffer is already at capacity the oldest record is evicted.
   *
   * @param record - The {@link ProfileRecord} to store.
   */
  push(record: ProfileRecord): void {
    this.buffer[this.head] = record
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }

  /**
   * Return all stored records sorted most-recent first.
   *
   * @returns Snapshot array; mutations do not affect the buffer.
   */
  list(): ProfileRecord[] {
    const result: ProfileRecord[] = []
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity
      const item = this.buffer[idx]
      if (item !== undefined) result.push(item)
    }
    return result
  }

  /** Remove all stored records. */
  clear(): void {
    this.buffer = new Array<ProfileRecord>(this.capacity)
    this.head = 0
    this.count = 0
  }
}
