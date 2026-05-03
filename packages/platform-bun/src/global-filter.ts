import { HttpException } from '@bunnest/common'
import type { ExceptionFilter, ExecutionContext } from '@bunnest/common'

export class GlobalExceptionFilter implements ExceptionFilter<unknown> {
  catch(exception: unknown, _context: ExecutionContext): Response {
    if (exception instanceof HttpException) {
      return Response.json(
        { statusCode: exception.statusCode, message: exception.message },
        { status: exception.statusCode },
      )
    }

    const isProduction = Bun.env.NODE_ENV === 'production'
    const message = isProduction ? 'Internal Server Error' : String(exception)

    return Response.json({ statusCode: 500, message }, { status: 500 })
  }
}
