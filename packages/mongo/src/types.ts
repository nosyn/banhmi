/**
 * Options for connecting to MongoDB via `MongoModule.forRoot`.
 *
 * @example
 * MongoModule.forRoot({
 *   url: 'mongodb://localhost:27017',
 *   database: 'mydb',
 * })
 */
export interface MongoOptions {
  /** Full MongoDB connection URL. E.g. `mongodb://user:pass@localhost:27017`. */
  url: string
  /** Name of the database to use. */
  database: string
}
