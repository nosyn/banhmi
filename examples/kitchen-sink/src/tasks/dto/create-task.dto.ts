import { IsIn, IsOptional, IsString, MinLength } from '@banhmi/validation'

/**
 * DTO for creating a new task.
 *
 * Validated via `classValidator(CreateTaskDto)` in the tasks controller.
 */
export class CreateTaskDto {
  /**
   * Task title — required, minimum 1 character.
   */
  @IsString()
  @MinLength(1)
  title: string = ''

  /**
   * Initial task status.
   * @default 'pending'
   */
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in-progress', 'done'])
  status: string = 'pending'

  /**
   * Optional free-text description.
   */
  @IsOptional()
  @IsString()
  description: string = ''
}
