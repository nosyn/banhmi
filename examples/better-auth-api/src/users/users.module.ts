import { Module } from 'banhmi'
import { AuthModule } from '../auth/auth.module'
import { UsersController } from './users.controller'

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
})
export class UsersModule {}
