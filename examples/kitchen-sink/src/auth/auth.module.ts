import { JwtModule } from '@banhmi/jwt'
import { Module } from 'banhmi'
import { config } from '../config'
import { AuthController } from './auth.controller'

/**
 * Auth module — provides JWT signing/verification and the auth controller.
 */
@Module({
  imports: [
    JwtModule.forRoot({
      secret: config.jwtSecret,
      expiresIn: config.jwtExpiresIn,
    }),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
