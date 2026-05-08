/**
 * Cat entity class used as the @Repository target.
 *
 * The entity class name drives the collection name in MongoDB — `Cat` maps to
 * the `cat` collection by default. `CatsRepository` overrides this to `cats`.
 */
export class Cat {
  /** MongoDB document id. Populated after insertion. */
  _id?: unknown
  /** Cat's name. */
  name!: string
  /** Cat's age in years. */
  age!: number
}
