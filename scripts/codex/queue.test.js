import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CodexQueue } from './queue'

test('enqueue persists tasks to disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'codex-'))
  try {
    const q = new CodexQueue(join(dir, 'queue.json'))
    q.enqueue({ id: 't1', kind: 'scaffold', prompt: 'do thing' })
    expect(q.list()).toHaveLength(1)
    expect(q.list()[0].id).toBe('t1')
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
})
test('reload reads persisted state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'codex-'))
  try {
    const path = join(dir, 'queue.json')
    const a = new CodexQueue(path)
    a.enqueue({ id: 't1', kind: 'scaffold', prompt: 'do thing' })
    const b = new CodexQueue(path)
    expect(b.list()).toHaveLength(1)
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
})
test('markDone removes the task', () => {
  const dir = mkdtempSync(join(tmpdir(), 'codex-'))
  try {
    const q = new CodexQueue(join(dir, 'queue.json'))
    q.enqueue({ id: 't1', kind: 'scaffold', prompt: 'do thing' })
    q.markDone('t1')
    expect(q.list()).toHaveLength(0)
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
})
