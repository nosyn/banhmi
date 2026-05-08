const REPO_ENTITY = Symbol('banhmi:sqlite:repo_entity')
export function Repository(entity) {
  return (_target, context) => {
    context.metadata[REPO_ENTITY] = entity
  }
}
export class BaseRepository {
  db
  constructor(db) {
    this.db = db
  }
  get Entity() {
    const meta = this.constructor[Symbol.metadata]
    return meta?.[REPO_ENTITY] ?? Object
  }
  findAll() {
    return this.db
      .query(`SELECT * FROM ${this.tableName}`)
      .as(this.Entity)
      .all()
  }
  findById(id) {
    return (
      this.db
        .query(`SELECT * FROM ${this.tableName} WHERE id = ?`)
        .as(this.Entity)
        .get(id) ?? null
    )
  }
  save(data) {
    const keys = Object.keys(data)
    const placeholders = keys.map(() => '?').join(', ')
    const values = Object.values(data)
    const result = this.db
      .query(
        `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      )
      .get(...values)
    return result?.id ?? 0
  }
  delete(id) {
    this.db.query(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id)
  }
  transaction(fn) {
    return this.db.transaction(fn)()
  }
}
