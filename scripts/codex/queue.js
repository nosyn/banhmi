import { existsSync, readFileSync, writeFileSync } from 'node:fs'
/**
 * File-backed queue of cookie-cutter work. Persisted as a JSON array.
 *
 * @example
 * const q = new CodexQueue('codex.queue.json')
 * q.enqueue({ id: 'scaffold-middleware', kind: 'scaffold', prompt: '...' })
 */
export class CodexQueue {
  path
  constructor(path) {
    this.path = path
  }
  list() {
    if (!existsSync(this.path)) return []
    return JSON.parse(readFileSync(this.path, 'utf8'))
  }
  enqueue(task) {
    const tasks = this.list()
    tasks.push(task)
    writeFileSync(this.path, JSON.stringify(tasks, null, 2))
  }
  markDone(id) {
    const tasks = this.list().filter((t) => t.id !== id)
    writeFileSync(this.path, JSON.stringify(tasks, null, 2))
  }
}
