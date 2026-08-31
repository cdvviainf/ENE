import { describe, it, expect } from 'vitest'
import { condicionPagoCreateSchema } from '../src/modules/config/condiciones-pago/condiciones-pago.schema.js'

// ============================================================================
// CondicionPago — Docs/reglas-negocio.md §13. RN-PAG-02: la suma de
// porcentajes de las cuotas debe ser exactamente 100%. La regla vive en el
// schema Zod (condicionPagoCreateSchema), no en el service — es el único
// punto donde se aplica antes de persistir, igual que la validación de RUT en
// otros módulos vive en su capa correspondiente.
// ============================================================================

describe('RN-PAG-02: las cuotas deben sumar exactamente 100%', () => {
  it('rechaza un cronograma que suma 90% (50% + 40%)', () => {
    const resultado = condicionPagoCreateSchema.safeParse({
      codigo: 'QAP-01',
      nombre: 'Condición QA',
      cuotas: [
        { porcentaje: 50, plazoDias: 0 },
        { porcentaje: 40, plazoDias: 30 },
      ],
    })
    expect(resultado.success).toBe(false)
  })

  it('acepta un cronograma que suma exactamente 100% (50% + 50%)', () => {
    const resultado = condicionPagoCreateSchema.safeParse({
      codigo: 'QAP-02',
      nombre: 'Condición QA',
      cuotas: [
        { porcentaje: 50, plazoDias: 0 },
        { porcentaje: 50, plazoDias: 30 },
      ],
    })
    expect(resultado.success).toBe(true)
  })

  it('rechaza aunque el redondeo de punto flotante "parezca" 100% (33.333 × 3)', () => {
    // Caso de regresión QA-PAG-001: sumar con `number` sin control de
    // decimales aceptaba esto porque 33.333×3=99.999→100 al redondear el
    // total, pero Decimal(5,2) en BD persiste 33.33×3=99.99.
    const resultado = condicionPagoCreateSchema.safeParse({
      codigo: 'QAP-03',
      nombre: 'Condición QA',
      cuotas: [
        { porcentaje: 33.333, plazoDias: 0 },
        { porcentaje: 33.333, plazoDias: 30 },
        { porcentaje: 33.333, plazoDias: 60 },
      ],
    })
    expect(resultado.success).toBe(false)
  })
})
