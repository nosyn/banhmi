import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@banhmi/openapi'
import { Throttle } from '@banhmi/throttler'
import { serialize } from '@banhmi/transform'
import { AdaptedValidationPipe, classValidator } from '@banhmi/validation'
import { Version } from '@banhmi/versioning'
import type { RouteCtx } from 'banhmi'
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Patch,
  Post,
} from 'banhmi'
import { CreateTaskDto } from './dto/create-task.dto'
import { TaskDto } from './dto/task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { TasksService } from './tasks.service'

const createPipe = new AdaptedValidationPipe(classValidator(CreateTaskDto))
const updatePipe = new AdaptedValidationPipe(classValidator(UpdateTaskDto))

/**
 * v1 Tasks controller.
 *
 * Demonstrates: versioning, class-validator validation, throttling on PATCH,
 * and `@banhmi/transform` serialization that strips unexpected fields.
 */
@ApiTags('tasks-v1')
@Version('1')
@Controller('/tasks')
@Injectable()
export class TasksV1Controller {
  static inject = [TasksService] as const

  constructor(private readonly tasks: TasksService) {}

  @ApiOperation({ summary: 'List all tasks (v1) — cached 30 s' })
  @ApiResponse({ status: 200, description: 'Array of TaskDto' })
  @Get()
  async findAll() {
    const tasks = await this.tasks.listCached()
    return tasks.map((t) => serialize(t, TaskDto))
  }

  @ApiOperation({ summary: 'Create a task (v1)' })
  @ApiBody({ type: 'object', description: 'CreateTaskDto', required: true })
  @ApiResponse({ status: 201, description: 'Created task' })
  @Post()
  @HttpCode(201)
  async create(ctx: RouteCtx) {
    const body = await ctx.json<unknown>()
    const dto = createPipe.transform(body, { type: 'body' })
    const task = await this.tasks.create(dto)
    return serialize(task, TaskDto)
  }

  @ApiOperation({ summary: 'Patch a task (v1) — throttled at 5 req/min' })
  @ApiParam({
    name: 'id',
    type: 'string',
    required: true,
    description: 'Task ID',
  })
  @ApiResponse({ status: 200, description: 'Updated task' })
  @Throttle({ limit: 5, ttl: 60_000 })
  @Patch('/:id')
  async update(ctx: RouteCtx) {
    const body = await ctx.json<unknown>()
    const dto = updatePipe.transform(body, { type: 'body' })
    const task = this.tasks.update(Number(ctx.params.id), dto)
    return serialize(task, TaskDto)
  }

  @ApiOperation({ summary: 'Delete a task (v1)' })
  @ApiParam({
    name: 'id',
    type: 'string',
    required: true,
    description: 'Task ID',
  })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  @Delete('/:id')
  @HttpCode(204)
  remove(ctx: RouteCtx) {
    this.tasks.remove(Number(ctx.params.id))
  }
}
