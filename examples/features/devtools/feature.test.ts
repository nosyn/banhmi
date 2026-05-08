import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { DiGraph } from '@banhmi/devtools'
import type { BanhmiApplication } from 'banhmi'
import { BanhmiFactory } from 'banhmi'
import { AppModule } from './index'

let app: BanhmiApplication
let base: string

beforeAll(async () => {
  app = await BanhmiFactory.create(AppModule)
  await app.listen(0)
  base = app.getUrl()
})

afterAll(async () => {
  await app.close()
})

describe('devtools feature example', () => {
  test('application starts and catalog route works', async () => {
    const res = await fetch(`${base}/catalog`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /__banhmi/devtools/graph.json is reachable', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
    expect(res.status).toBe(200)
    const graph = (await res.json()) as DiGraph
    expect(Array.isArray(graph.nodes)).toBe(true)
    expect(Array.isArray(graph.edges)).toBe(true)
  })

  test('graph.json contains the CatalogController module', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
    const graph = (await res.json()) as DiGraph
    const appModule = graph.nodes.find((n) => n.name === 'AppModule')
    expect(appModule).toBeDefined()
    const catalogCtrl = graph.nodes.find((n) => n.name === 'CatalogController')
    expect(catalogCtrl).toBeDefined()
    expect(catalogCtrl?.kind).toBe('controller')
  })

  test('graph.json contains CatalogService as a provider', async () => {
    const res = await fetch(`${base}/__banhmi/devtools/graph.json`)
    const graph = (await res.json()) as DiGraph
    const svc = graph.nodes.find((n) => n.name === 'CatalogService')
    expect(svc).toBeDefined()
    expect(svc?.kind).toBe('provider')
  })

  test('devtools HTML index is served', async () => {
    const res = await fetch(`${base}/__banhmi/devtools`)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('Banhmi Devtools')
  })
})
