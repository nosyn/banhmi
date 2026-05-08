import { Module } from 'banhmi'
import { DatabaseModule } from './database/database.module'
import { PostsController } from './posts/posts.controller'
import { PostsService } from './posts/posts.service'
import { UsersController } from './users/users.controller'
import { UsersService } from './users/users.service'
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController, PostsController],
  providers: [UsersService, PostsService],
})
export class AppModule {}
