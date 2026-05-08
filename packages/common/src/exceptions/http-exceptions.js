import { HttpException } from './http-exception'
export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request', options) {
    super(message, 400, options)
  }
}
export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized', options) {
    super(message, 401, options)
  }
}
export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden', options) {
    super(message, 403, options)
  }
}
export class NotFoundException extends HttpException {
  constructor(message = 'Not Found', options) {
    super(message, 404, options)
  }
}
export class MethodNotAllowedException extends HttpException {
  constructor(message = 'Method Not Allowed', options) {
    super(message, 405, options)
  }
}
export class ConflictException extends HttpException {
  constructor(message = 'Conflict', options) {
    super(message, 409, options)
  }
}
export class GoneException extends HttpException {
  constructor(message = 'Gone', options) {
    super(message, 410, options)
  }
}
export class UnprocessableEntityException extends HttpException {
  constructor(message = 'Unprocessable Entity', options) {
    super(message, 422, options)
  }
}
export class TooManyRequestsException extends HttpException {
  constructor(message = 'Too Many Requests', options) {
    super(message, 429, options)
  }
}
export class InternalServerErrorException extends HttpException {
  constructor(message = 'Internal Server Error', options) {
    super(message, 500, options)
  }
}
