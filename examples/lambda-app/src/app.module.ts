import { Controller, Get, Injectable, Module, Post } from '@banhmi/common'

export interface Item {
  id: number
  label: string
}

@Injectable()
class ItemsService {
  private store = new Map<number, Item>([[1, { id: 1, label: 'First item' }]])

  findAll(): Item[] {
    return [...this.store.values()]
  }

  create(label: string): Item {
    const id = this.store.size + 1
    const item: Item = { id, label }
    this.store.set(id, item)
    return item
  }
}

@Controller('/items')
class ItemsController {
  static inject = [ItemsService] as const

  constructor(private svc: ItemsService) {}

  @Get('/')
  findAll(): Item[] {
    return this.svc.findAll()
  }

  @Post('/')
  async create(ctx: { json<T>(): Promise<T> }): Promise<Item> {
    const body = await ctx.json<{ label: string }>()
    return this.svc.create(body.label)
  }
}

@Module({ controllers: [ItemsController], providers: [ItemsService] })
export class AppModule {}
