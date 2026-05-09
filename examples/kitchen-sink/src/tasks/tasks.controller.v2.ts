import { ApiOperation, ApiResponse, ApiTags } from '@banhmi/openapi'
import { Version } from '@banhmi/versioning'
import { Controller, Get, Injectable } from 'banhmi'
import { TasksService } from './tasks.service'

/**
 * v2 Tasks controller — returns the full task shape (including description).
 *
 * v1 omits `description`; v2 includes it, demonstrating versioning with a
 * richer response.
 */
@ApiTags('tasks-v2')
@Version('2')
@Controller('/tasks')
@Injectable()
export class TasksV2Controller {
  static inject = [TasksService] as const

  constructor(private readonly tasks: TasksService) {}

  @ApiOperation({ summary: 'List all tasks (v2) — includes description' })
  @ApiResponse({ status: 200, description: 'Full task array with description' })
  @Get()
  findAll() {
    return this.tasks.findAll()
  }
}
