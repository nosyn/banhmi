import { Module } from 'banhmi'
import { UsersModule } from './users/users.module'
@Module({
  imports: [UsersModule],
})
export class AppModule {}
