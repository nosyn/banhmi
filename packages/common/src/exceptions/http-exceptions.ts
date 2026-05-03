import { HttpException } from './http-exception'

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request', options?: { cause?: Error }) {
    super(message, 400, options)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized', options?: { cause?: Error }) {
    super(message, 401, options)
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden', options?: { cause?: Error }) {
    super(message, 403, options)
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found', options?: { cause?: Error }) {
    super(message, 404, options)
  }
}

export class MethodNotAllowedException extends HttpException {
  constructor(message = 'Method Not Allowed', options?: { cause?: Error }) {
    super(message, 405, options)
  }
}

export class ConflictException extends HttpException {
  constructor(message = 'Conflict', options?: { cause?: Error }) {
    super(message, 409, options)
  }
}

export class GoneException extends HttpException {
  constructor(message = 'Gone', options?: { cause?: Error }) {
    super(message, 410, options)
  }
}

export class UnprocessableEntityException extends HttpException {
  constructor(message = 'Unprocessable Entity', options?: { cause?: Error }) {
    super(message, 422, options)
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message = 'Too Many Requests', options?: { cause?: Error }) {
    super(message, 429, options)
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message = 'Internal Server Error', options?: { cause?: Error }) {
    super(message, 500, options)
  }
}
