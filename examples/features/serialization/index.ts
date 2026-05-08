// Demo: @banhmi/transform — serialization with groups.
//
// GET /profile       — returns user data (password excluded).
// GET /admin/profile — returns user data with email included (admin group).
import { Exclude, Expose, serialize } from '@banhmi/transform'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Module } from 'banhmi'

class UserDto {
  name = ''

  @Exclude()
  password = ''

  @Expose({ name: 'user_id' })
  id = 0

  /** Only visible to callers that request the 'admin' group. */
  @Expose({ groups: ['admin'] })
  email = ''
}

const DEMO_USER = {
  id: 1,
  name: 'mochi',
  password: 'hunter2',
  email: 'mochi@example.com',
}

@Controller()
export class UserController {
  @Get('/profile')
  profile(_ctx: RouteCtx) {
    return serialize(DEMO_USER, UserDto)
  }

  @Get('/admin/profile')
  adminProfile(_ctx: RouteCtx) {
    return serialize(DEMO_USER, UserDto, { groups: ['admin'] })
  }
}

@Module({ controllers: [UserController] })
export class AppModule {}
