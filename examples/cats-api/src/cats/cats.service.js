import { Injectable, NotFoundException } from 'banhmi'
@Injectable()
export class CatsService {
  static inject = []
  cats = []
  nextId = 1
  findAll() {
    return this.cats
  }
  findById(id) {
    const cat = this.cats.find((c) => c.id === id)
    if (!cat) throw new NotFoundException(`Cat #${id} not found`)
    return cat
  }
  create(name, age) {
    const cat = { id: this.nextId++, name, age }
    this.cats.push(cat)
    return cat
  }
  delete(id) {
    const index = this.cats.findIndex((c) => c.id === id)
    if (index === -1) throw new NotFoundException(`Cat #${id} not found`)
    this.cats.splice(index, 1)
  }
}
