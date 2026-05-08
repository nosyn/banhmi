import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Drizzle table schema for the `cats` table used in the demo.
 *
 * @example
 * import { cats } from './schema'
 * const all = await db.select().from(cats)
 */
export const cats = sqliteTable('cats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  breed: text('breed').notNull().default('unknown'),
})

export type Cat = typeof cats.$inferSelect
export type NewCat = typeof cats.$inferInsert
