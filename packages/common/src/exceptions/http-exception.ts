export class HttpException extends Error {
  readonly statusCode: number

  constructor(
    message: string,
    statusCode: number,
    options?: { cause?: Error },
  ) {
    super(message, { cause: options?.cause })
    this.statusCode = statusCode
    this.name = this.constructor.name
  }
}
