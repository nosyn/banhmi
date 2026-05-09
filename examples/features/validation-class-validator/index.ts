// Demo: @banhmi/validation — class-validator-style decorators
//
// POST /users — validates a CreateUserDto with 6+ decorators.
//   Valid input  → 200 with echoed DTO.
//   Invalid input → 400 with structured errors.

import {
  AdaptedValidationPipe,
  classValidator,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from '@banhmi/validation'
import type { RouteCtx } from 'banhmi'
import { Controller, Module, Post } from 'banhmi'

// ─── DTO ─────────────────────────────────────────────────────────────────────

class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string

  @IsEmail()
  email!: string

  @IsInt()
  @Min(0)
  age!: number

  @IsIn(['admin', 'user', 'guest'])
  role!: string

  @IsBoolean()
  active!: boolean

  @IsOptional()
  @IsString()
  bio?: string
}

// ─── Controller ───────────────────────────────────────────────────────────────

const pipe = new AdaptedValidationPipe(classValidator(CreateUserDto))

@Controller('/users')
export class UsersController {
  @Post()
  async create(ctx: RouteCtx) {
    const body = await ctx.json()
    const dto = pipe.transform(body, { type: 'body' })
    return { created: true, data: dto }
  }
}

// ─── App module ───────────────────────────────────────────────────────────────

@Module({ controllers: [UsersController] })
export class AppModule {}
