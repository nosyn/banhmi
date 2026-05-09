import { Cacheable, MemoryCacheStore } from '@banhmi/cache'
import { EVENT_EMITTER_TOKEN, type EventEmitter } from '@banhmi/events'
import type { Logger } from '@banhmi/logger'
import { InjectLogger } from '@banhmi/logger'
import type { Queue } from '@banhmi/queue'
import { InjectQueue } from '@banhmi/queue'
import { Injectable, NotFoundException } from 'banhmi'
import type { CreateTaskDto } from './dto/create-task.dto'
import type { UpdateTaskDto } from './dto/update-task.dto'
import type { Task } from './tasks.entity'
import { TasksRepository } from './tasks.repository'

/** Shared counter for tests: number of email queue jobs enqueued. */
export let emailJobCount = 0

/** Reset the email job counter — used in integration tests. */
export function resetEmailJobCount(): void {
  emailJobCount = 0
}

/**
 * In-process cache store shared across the TasksService.
 *
 * Kept at module scope so `@Cacheable` can reference a concrete instance at
 * decorator-definition time (TC39 Stage 3 decorators run before DI resolution).
 */
export const taskListStore = new MemoryCacheStore()

/**
 * Business logic for task CRUD.
 *
 * On create: persists to SQLite, enqueues an email notification, and emits a
 * `task.created` event. On delete: emits `task.deleted`.
 */
@Injectable()
export class TasksService {
  static inject = [
    TasksRepository,
    EVENT_EMITTER_TOKEN,
    InjectQueue('emails'),
    InjectLogger('TasksService'),
  ] as const

  constructor(
    private readonly repo: TasksRepository,
    private readonly emitter: EventEmitter,
    private readonly emailQueue: Queue<{ to: string; subject: string }>,
    private readonly logger: Logger,
  ) {}

  /**
   * List all tasks — cached for 30 seconds.
   */
  @Cacheable(30, { store: taskListStore, keyPrefix: 'findAll' })
  async listCached(): Promise<Task[]> {
    return this.repo.findAll()
  }

  /**
   * List all tasks without cache.
   */
  findAll(): Task[] {
    return this.repo.findAll()
  }

  /**
   * Find a task by ID or throw {@link NotFoundException}.
   */
  findById(id: number): Task {
    const task = this.repo.findById(id)
    if (!task) throw new NotFoundException(`Task #${id} not found`)
    return task
  }

  /**
   * Create a new task, enqueue email notification, and emit `task.created`.
   */
  async create(dto: CreateTaskDto): Promise<Task> {
    const id = this.repo.save({
      title: dto.title,
      status: dto.status ?? 'pending',
      description: dto.description ?? '',
      createdAt: new Date().toISOString(),
    })

    const task = this.repo.findById(id)
    if (!task) throw new Error(`Failed to retrieve new task #${id}`)

    this.logger.info('task created', { id: task.id, title: task.title })

    // Enqueue email notification (mocked mailer)
    await this.emailQueue.add('send', {
      to: 'team@example.com',
      subject: `Task created: ${task.title}`,
    })
    emailJobCount++

    // Emit event so SSE / WS listeners can react
    this.emitter.emit('task.created', task)

    // Bust the list cache
    await taskListStore.del('findAll:[]:')

    return task
  }

  /**
   * Patch a task by ID.
   */
  update(id: number, dto: UpdateTaskDto): Task {
    this.findById(id) // throws if missing
    const updated = this.repo.update(id, dto)
    if (!updated) throw new NotFoundException(`Task #${id} not found`)
    return updated
  }

  /**
   * Delete a task by ID and emit `task.deleted`.
   */
  remove(id: number): void {
    this.findById(id) // throws if missing
    this.repo.delete(id)
    this.emitter.emit('task.deleted', { id })
    this.logger.info('task deleted', { id })
  }

  /**
   * Garbage-collect tasks older than the given threshold.
   *
   * Called by the cleanup cron job.
   *
   * @param olderThanMs - Age threshold in milliseconds.
   * @returns Number of deleted rows.
   */
  gcOlderThan(olderThanMs: number): number {
    return this.repo.deleteOlderThan(olderThanMs)
  }
}
