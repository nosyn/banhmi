import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * A single cookie-cutter task handed off to a Codex agent by the master orchestrator.
 */
export type CodexTask = {
  id: string
  kind: 'scaffold' | 'docs' | 'rename' | 'wiring'
  prompt: string
}

/**
 * File-backed queue of cookie-cutter work. Persisted as a JSON array.
 *
 * @example
 * const q = new CodexQueue('codex.queue.json')
 * q.enqueue({ id: 'scaffold-middleware', kind: 'scaffold', prompt: '...' })
 */
export class CodexQueue {
  constructor(private readonly path: string) {}

  list(): CodexTask[] {
    if (!existsSync(this.path)) return []
    return JSON.parse(readFileSync(this.path, 'utf8')) as CodexTask[]
  }

  enqueue(task: CodexTask): void {
    const tasks = this.list()
    tasks.push(task)
    writeFileSync(this.path, JSON.stringify(tasks, null, 2))
  }

  markDone(id: string): void {
    const tasks = this.list().filter((t) => t.id !== id)
    writeFileSync(this.path, JSON.stringify(tasks, null, 2))
  }
}
