import { Module } from 'banhmi'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'

@Module({
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
