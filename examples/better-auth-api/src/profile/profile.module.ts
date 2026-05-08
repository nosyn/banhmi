import { Module } from 'banhmi'
import { ProfileController } from './profile.controller'

@Module({
  controllers: [ProfileController],
})
export class ProfileModule {}
