import { IsIn, IsOptional, IsString, MinLength } from '@banhmi/validation'

/**
 * DTO for patching an existing task.
 *
 * All fields are optional; only provided fields are updated.
 */
export class UpdateTaskDto {
  /**
   * Updated title — at least 1 character if provided.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string

  /**
   * Updated status.
   */
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in-progress', 'done'])
  status?: string

  /**
   * Updated description.
   */
  @IsOptional()
  @IsString()
  description?: string
}
