import { Module } from 'banhmi'
import { UsersController } from './users/users.controller'

@Module({
  controllers: [UsersController],
})
export class AppModule {}
