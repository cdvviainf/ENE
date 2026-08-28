import { describe, it, expect } from 'vitest'
import { validarRutChileno, formatearRut } from '../src/shared/rut-validator.js'

// ============================================================================
// RUT chileno — usado por RN-CLI-01 (cliente EMPRESA) y RN-PRV-01 (proveedor).
// Unitario puro, sin DB.
// ============================================================================

describe('validarRutChileno', () => {
  it('acepta un RUT válido con guión', () => {
    expect(validarRutChileno('11111111-1')).toBe(true)
  })

  it('acepta un RUT válido con puntos y guión', () => {
    expect(validarRutChileno('11.111.111-1')).toBe(true)
  })

  it('acepta un dígito verificador K en mayúscula o minúscula', () => {
    expect(validarRutChileno('6-k')).toBe(true)
    expect(validarRutChileno('6-K')).toBe(true)
  })

  it('acepta el RUT genérico usado por proveedores extranjeros (RN-PRV-01)', () => {
    expect(validarRutChileno('55555555-5')).toBe(true)
  })

  it('rechaza un dígito verificador incorrecto', () => {
    expect(validarRutChileno('11111111-2')).toBe(false)
  })

  it('rechaza un RUT sin guión', () => {
    expect(validarRutChileno('111111111')).toBe(false)
  })

  it('rechaza un cuerpo con letras', () => {
    expect(validarRutChileno('1A111111-1')).toBe(false)
  })

  it('rechaza un dígito verificador con más de un carácter', () => {
    expect(validarRutChileno('11111111-11')).toBe(false)
  })
})

describe('formatearRut', () => {
  it('quita los puntos y mantiene el guión', () => {
    expect(formatearRut('11.111.111-1')).toBe('11111111-1')
  })

  it('normaliza a mayúsculas el dígito verificador K', () => {
    expect(formatearRut('6-k')).toBe('6-K')
  })

  it('separa el dígito verificador si viene sin guión', () => {
    expect(formatearRut('111111111')).toBe('11111111-1')
  })
})
