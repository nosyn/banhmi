import { describe, expect, test } from 'bun:test'
import { HttpException } from '../src/exceptions/http-exception'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  InternalServerErrorException,
  MethodNotAllowedException,
  NotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '../src/exceptions/http-exceptions'

describe('HttpException', () => {
  test('stores message and statusCode', () => {
    const ex = new HttpException('oops', 418)
    expect(ex.message).toBe('oops')
    expect(ex.statusCode).toBe(418)
  })
  test('stores cause', () => {
    const cause = new Error('root')
    const ex = new HttpException('wrapper', 500, { cause })
    expect(ex.cause).toBe(cause)
  })
  test('is instanceof Error', () => {
    expect(new HttpException('x', 400)).toBeInstanceOf(Error)
  })
})
describe('status-specific exceptions', () => {
  test('BadRequestException has statusCode 400', () => {
    expect(new BadRequestException('bad').statusCode).toBe(400)
  })
  test('NotFoundException has statusCode 404', () => {
    expect(new NotFoundException('not found').statusCode).toBe(404)
  })
  test('ForbiddenException has statusCode 403', () => {
    expect(new ForbiddenException().statusCode).toBe(403)
  })
  test('UnauthorizedException has statusCode 401', () => {
    expect(new UnauthorizedException().statusCode).toBe(401)
  })
  test('ConflictException has statusCode 409', () => {
    expect(new ConflictException('conflict').statusCode).toBe(409)
  })
  test('UnprocessableEntityException has statusCode 422', () => {
    expect(new UnprocessableEntityException('invalid').statusCode).toBe(422)
  })
  test('InternalServerErrorException has statusCode 500', () => {
    expect(new InternalServerErrorException().statusCode).toBe(500)
  })
  test('GoneException has statusCode 410', () => {
    expect(new GoneException().statusCode).toBe(410)
  })
  test('MethodNotAllowedException has statusCode 405', () => {
    expect(new MethodNotAllowedException().statusCode).toBe(405)
  })
  test('TooManyRequestsException has statusCode 429', () => {
    expect(new TooManyRequestsException().statusCode).toBe(429)
  })
})
