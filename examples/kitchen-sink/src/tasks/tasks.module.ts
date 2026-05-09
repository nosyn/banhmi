import { createChildLoggerProvider } from '@banhmi/logger'
import { Module } from 'banhmi'
import { TasksV1Controller } from './tasks.controller.v1'
import { TasksV2Controller } from './tasks.controller.v2'
import { TasksRepository } from './tasks.repository'
import { TasksService } from './tasks.service'

/**
 * Module that bundles tasks CRUD, versioned controllers, the SQLite repository,
 * and a named child logger.
 */
@Module({
  controllers: [TasksV1Controller, TasksV2Controller],
  providers: [
    TasksService,
    TasksRepository,
    createChildLoggerProvider('TasksService'),
  ],
  exports: [TasksService],
})
export class TasksModule {}
