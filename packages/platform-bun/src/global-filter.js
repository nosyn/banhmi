import { HttpException } from '@banhmi/common'
export class GlobalExceptionFilter {
  catch(exception, _context) {
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
