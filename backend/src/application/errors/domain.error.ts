export class DomainError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(
    message: string,
    statusCode = 400,
    code = 'DOMAIN_ERROR',
    details?: unknown,
  ) {
    super(message)
    this.name = 'DomainError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}
