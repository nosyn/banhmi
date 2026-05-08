import { Injectable, Inject } from '@nestjs/common'
import { ApiModelProperty } from '@nestjs/swagger'

export const CAT_REPO = Symbol('CAT_REPO')

export class CatDto {
  @ApiModelProperty()
  name: string = ''
}

@Injectable()
export class CatsService {
  constructor(@Inject(CAT_REPO) private repo: unknown) {}

  findAll(): CatDto[] {
    return []
  }
}
