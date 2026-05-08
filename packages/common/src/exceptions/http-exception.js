export class HttpException extends Error {
  statusCode
  constructor(message, statusCode, options) {
    super(message, { cause: options?.cause })
    this.statusCode = statusCode
    this.name = this.constructor.name
  }
}
