/**
 * Valida la complejidad de contraseña: ≥8 caracteres, al menos 1 mayúscula,
 * 1 minúscula, 1 número y 1 símbolo. Better Auth solo valida el largo mínimo;
 * esta política se aplica en el borde (alta de usuario y cambio de contraseña).
 * @returns Mensaje de error si no cumple, o null si es válida.
 */
export function validarComplejidadPassword(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(password)) return 'Debe contener al menos una letra mayúscula'
  if (!/[a-z]/.test(password)) return 'Debe contener al menos una letra minúscula'
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Debe contener al menos un símbolo (ej: !@#$%)'
  return null
}
