export class ErrorApp extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ErrorApp'
  }
}

export const noEncontrado = (recurso: string, id?: number | string) =>
  new ErrorApp('NOT_FOUND', `${recurso}${id !== undefined ? ` ${id}` : ''} no encontrado`, 404)

export const conflicto = (message: string, details?: unknown) =>
  new ErrorApp('CONFLICT', message, 409, details)

export const validacion = (message: string, details?: unknown) =>
  new ErrorApp('VALIDATION_ERROR', message, 422, details)

export const noAutorizado = (message = 'No autorizado') =>
  new ErrorApp('FORBIDDEN', message, 403)
