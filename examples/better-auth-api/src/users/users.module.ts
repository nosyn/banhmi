import { Module } from 'banhmi'
import { UsersController } from './users.controller'

@Module({
  controllers: [UsersController],
})
export class UsersModule {}
