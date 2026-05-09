import { Expose } from '@banhmi/transform'

/**
 * Serialisation DTO for a Task.
 *
 * {@link Expose} marks the safe fields; {@link serialize} will strip anything
 * not decorated when called with this class.
 */
export class TaskDto {
  @Expose()
  id: number = 0

  @Expose()
  title: string = ''

  @Expose()
  status: string = ''

  @Expose()
  description: string = ''

  @Expose()
  createdAt: string = ''
}
