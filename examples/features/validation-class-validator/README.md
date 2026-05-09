# validation-class-validator

Demonstrates `@banhmi/validation` class-validator-style decorators.

```ts
class CreateUserDto {
  @IsString() @MinLength(2) name!: string
  @IsEmail()                email!: string
  @IsInt() @Min(0)          age!: number
  @IsIn(['admin','user'])   role!: string
  @IsBoolean()              active!: boolean
  @IsOptional() @IsString() bio?: string
}

const v = classValidator(CreateUserDto)
const pipe = new AdaptedValidationPipe(v)
```

Valid input → `200 { created: true, data: { ... } }`.
Invalid input → `400` with structured errors array.
