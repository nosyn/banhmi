import { Module } from 'banhmi'
import { LegacyController } from './legacy.controller'

@Module({
  controllers: [LegacyController],
})
export class LegacyModule {}
