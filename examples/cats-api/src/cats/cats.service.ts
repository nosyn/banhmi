import { Injectable, NotFoundException } from 'banhmi'

interface Cat {
  id: number
  name: string
  age: number
}

@Injectable()
export class CatsService {
  static inject = [] as const

  private cats: Cat[] = []
  private nextId = 1

  findAll(): Cat[] {
    return this.cats
  }

  findById(id: number): Cat {
    const cat = this.cats.find((c) => c.id === id)
    if (!cat) throw new NotFoundException(`Cat #${id} not found`)
    return cat
  }

  create(name: string, age: number): Cat {
    const cat: Cat = { id: this.nextId++, name, age }
    this.cats.push(cat)
    return cat
  }

  delete(id: number): void {
    const index = this.cats.findIndex((c) => c.id === id)
    if (index === -1) throw new NotFoundException(`Cat #${id} not found`)
    this.cats.splice(index, 1)
  }
}
