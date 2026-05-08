import { afterEach, describe, expect, test } from 'bun:test'
import { Injectable } from '@banhmi/common'
import { Cron, Interval, Timeout } from '../src/decorators'
import { ScheduleExplorer } from '../src/explorer'
import { Scheduler } from '../src/scheduler'

describe('Scheduler', () => {
  let scheduler: Scheduler

  afterEach(() => {
    scheduler.cancelAll()
  })

  test('@Interval fires repeatedly until cancelled', async () => {
    scheduler = new Scheduler()
    const ticks: number[] = []
    const handle = scheduler.interval(30, () => ticks.push(Date.now()))

    await new Promise((r) => setTimeout(r, 120))
    handle.cancel()

    // Should have fired at least 3 times (30ms interval over 120ms)
    expect(ticks.length).toBeGreaterThanOrEqual(3)
  })

  test('@Timeout fires once', async () => {
    scheduler = new Scheduler()
    let count = 0
    scheduler.timeout(30, () => {
      count++
    })

    await new Promise((r) => setTimeout(r, 100))
    expect(count).toBe(1)
  })

  test('interval handle.cancel() stops future ticks', async () => {
    scheduler = new Scheduler()
    let count = 0
    const handle = scheduler.interval(20, () => {
      count++
    })

    await new Promise((r) => setTimeout(r, 50))
    const countAtCancel = count
    handle.cancel()

    await new Promise((r) => setTimeout(r, 50))
    // No more ticks after cancel
    expect(count).toBe(countAtCancel)
  })

  test('timeout handle.cancel() prevents the timeout from firing', async () => {
    scheduler = new Scheduler()
    let fired = false
    const handle = scheduler.timeout(100, () => {
      fired = true
    })
    handle.cancel()

    await new Promise((r) => setTimeout(r, 150))
    expect(fired).toBe(false)
  })

  test('cancelAll() stops all registered handles', async () => {
    scheduler = new Scheduler()
    const ticks1: number[] = []
    const ticks2: number[] = []

    scheduler.interval(20, () => ticks1.push(1))
    scheduler.interval(20, () => ticks2.push(2))

    await new Promise((r) => setTimeout(r, 50))
    scheduler.cancelAll()
    const c1 = ticks1.length
    const c2 = ticks2.length

    await new Promise((r) => setTimeout(r, 50))
    expect(ticks1.length).toBe(c1)
    expect(ticks2.length).toBe(c2)
  })

  test('handler errors are swallowed without stopping the interval', async () => {
    scheduler = new Scheduler()
    let count = 0
    scheduler.interval(30, () => {
      count++
      throw new Error('handler error')
    })

    await new Promise((r) => setTimeout(r, 100))
    // Should have ticked at least twice despite errors
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

describe('ScheduleExplorer', () => {
  test('@Interval decorator wires up via explorer', async () => {
    const ticks: number[] = []

    @Injectable()
    class TickService {
      @Interval(30)
      tick() {
        ticks.push(Date.now())
      }
    }

    const scheduler = new Scheduler()
    const instance = new TickService()
    const explorer = new ScheduleExplorer()
    explorer.explore(scheduler, [[instance, TickService]])

    await new Promise((r) => setTimeout(r, 120))
    scheduler.cancelAll()

    expect(ticks.length).toBeGreaterThanOrEqual(3)
  })

  test('@Timeout decorator wires up via explorer', async () => {
    let fired = false

    @Injectable()
    class OnceService {
      @Timeout(30)
      doOnce() {
        fired = true
      }
    }

    const scheduler = new Scheduler()
    const instance = new OnceService()
    const explorer = new ScheduleExplorer()
    explorer.explore(scheduler, [[instance, OnceService]])

    await new Promise((r) => setTimeout(r, 80))
    scheduler.cancelAll()

    expect(fired).toBe(true)
  })

  test('@Cron decorator stores metadata correctly', () => {
    @Injectable()
    class CronService {
      @Cron('*/1 * * * *')
      runEveryMinute() {}
    }

    const { CRON_METADATA } = require('../src/metadata')
    const meta = CronService[Symbol.metadata]
    const entries = meta?.[CRON_METADATA]
    expect(entries).toBeDefined()
    expect(entries[0].expression).toBe('*/1 * * * *')
    expect(entries[0].methodName).toBe('runEveryMinute')
  })

  test('OnApplicationShutdown cancels all jobs via scheduler.cancelAll()', async () => {
    const scheduler = new Scheduler()
    const ticks: number[] = []
    scheduler.interval(20, () => ticks.push(1))

    await new Promise((r) => setTimeout(r, 50))
    const countBefore = ticks.length
    scheduler.cancelAll()

    await new Promise((r) => setTimeout(r, 50))
    expect(ticks.length).toBe(countBefore)
  })
})
