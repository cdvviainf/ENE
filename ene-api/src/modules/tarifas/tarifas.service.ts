import { prisma } from '../../lib/prisma.js'
import { noEncontrado, conflicto, validacion } from '../../shared/errors.js'
import { tomarLockPorTexto, LOCK_TARIFARIO_VIGENCIA } from '../../shared/advisory-locks.js'
import { multiplicar, restar, monto, aString } from '../../shared/dinero/index.js'
import * as repo from './tarifas.repository.js'
import type { TarifarioCreateInput, TarifarioNuevaVersionInput, TarifarioValorInput } from './tarifas.schema.js'
import type { Advertencia, TramoCobertura } from './tarifas.types.js'

// ============================================================================
// Tarifario — Docs/reglas-negocio.md §4, Docs/mantenedores.md §7.
// RN-TAR-01 a RN-TAR-07: RN-TAR-06 distingue POST /tarifas (cadena nueva,
// version=1, solo si la vigencia no se solapa con ninguna activa) de
// POST /tarifas/:id/nueva-version (version+1, desactiva la anterior) —
// decisión de usuario 20-sep-2026. RN-COS-06 (el costoTeorico de una línea,
// una vez cargado, no se recalcula) es de Etapa 6; acá solo se respeta no
// tocando nunca TarifarioValor de versiones antiguas.
// ============================================================================

// ─── Funciones puras — RN-TAR-02, RN-TAR-07, RN-TAR-04, RN-TAR-05 ───────────
// buscarTramoQueCubra, seSolapanVigencias y advierteVigenciaVencida se
// exportan para que Etapa 6 (motor de costeo) las reutilice sin reimplementar
// la misma lógica.

/** RN-TAR-02 [BLOQUEA]: los tramos de un mismo tarifario no pueden solaparse
 * ni dejar huecos dentro del rango cubierto; solo el de mayor rango (tras
 * ordenar) puede tener `paxHasta` abierto. No exige que el primer tramo
 * empiece en 1 — un pax fuera de todo tramo es RN-TAR-03, responsabilidad de
 * Etapa 6 (costeo), no de este maestro. */
function validarTramos(valores: TarifarioValorInput[]): void {
  const tramos = valores.map((v) => ({ paxDesde: v.paxDesde!, paxHasta: v.paxHasta ?? null }))

  for (const t of tramos) {
    if (t.paxHasta !== null && t.paxHasta < t.paxDesde) {
      throw validacion(`Tramo invertido: paxDesde ${t.paxDesde} > paxHasta ${t.paxHasta} (RN-TAR-02)`)
    }
  }

  const ordenados = [...tramos].sort((a, b) => a.paxDesde - b.paxDesde)

  ordenados.forEach((actual, i) => {
    const esUltimo = i === ordenados.length - 1
    if (actual.paxHasta === null && !esUltimo) {
      throw conflicto(
        `Solo el tramo de mayor rango puede quedar abierto (paxHasta vacío); el tramo desde ${actual.paxDesde} no lo es (RN-TAR-02)`,
      )
    }
    if (i > 0) {
      const anterior = ordenados[i - 1]!
      if (actual.paxDesde <= anterior.paxHasta!) {
        throw conflicto(
          `Los tramos [${anterior.paxDesde}-${anterior.paxHasta}] y [${actual.paxDesde}-${actual.paxHasta ?? '∞'}] se solapan (RN-TAR-02)`,
        )
      }
      if (actual.paxDesde > anterior.paxHasta! + 1) {
        throw conflicto(
          `Hay un hueco entre los tramos [${anterior.paxDesde}-${anterior.paxHasta}] y [${actual.paxDesde}-...] (RN-TAR-02)`,
        )
      }
    }
  })
}

/** RN-TAR-03: dado un conjunto de tramos, encuentra el que cubre `pax` (o
 * `null` si ningún tramo lo cubre — Etapa 6 debe pedir la línea como OTRO). */
export function buscarTramoQueCubra<T extends TramoCobertura>(tramos: T[], pax: number): T | null {
  return tramos.find((t) => pax >= t.paxDesde && (t.paxHasta === null || pax <= t.paxHasta)) ?? null
}

/** RN-TAR-07 [BLOQUEA]: dos rangos de vigencia [desde, hasta|∞) se solapan a
 * menos que uno termine estrictamente antes de que el otro empiece. `null`
 * en `hasta` significa "nunca termina". */
export function seSolapanVigencias(aDesde: Date, aHasta: Date | null, bDesde: Date, bHasta: Date | null): boolean {
  const aTerminaAntesDeB = aHasta !== null && aHasta < bDesde
  const bTerminaAntesDeA = bHasta !== null && bHasta < aDesde
  return !(aTerminaAntesDeB || bTerminaAntesDeA)
}

/** RN-TAR-05 [ADVIERTE]: valorizar con un tarifario cuya vigencia ya venció
 * a la fecha de operación se permite, pero debe advertirse. Helper puro para
 * que Etapa 6 lo consuma al valorizar una línea. */
export function advierteVigenciaVencida(vigenciaHasta: Date | null, fechaOperacion: Date): boolean {
  return vigenciaHasta !== null && vigenciaHasta < fechaOperacion
}

/** RN-TAR-04: el suplemento single es un valor propio de la fila, no
 * derivado — pero debe cuadrar con `2×single − valorDeLaFila`. Si no cuadra,
 * o si no hay fila SINGLE en el mismo payload contra la que comparar, se
 * ADVIERTE (nunca bloquea) y el valor se guarda tal cual. Solo aplica a
 * DOBLE/TWIN: la fórmula de 2 personas no describe TRIPLE, y ninguna regla
 * define la de 3. */
function calcularAdvertenciasSuplemento(valores: TarifarioValorInput[]): Advertencia[] {
  const advertencias: Advertencia[] = []
  const filaSingle = valores.find((v) => v.acomodacion === 'SINGLE')

  for (const v of valores) {
    if (v.acomodacion !== 'DOBLE' && v.acomodacion !== 'TWIN') continue
    if (v.suplementoSingle == null) continue

    if (!filaSingle) {
      advertencias.push({
        regla: 'RN-TAR-04',
        mensaje: `No se pudo verificar el suplemento single de ${v.acomodacion}: el payload no incluye una fila SINGLE para comparar.`,
        detalle: { acomodacion: v.acomodacion, suplementoSingle: v.suplementoSingle },
      })
      continue
    }

    const esperado = restar(multiplicar('2', filaSingle.valor), v.valor)
    if (!monto(esperado).equals(monto(v.suplementoSingle))) {
      advertencias.push({
        regla: 'RN-TAR-04',
        mensaje:
          `El suplemento single de ${v.acomodacion} (${aString(v.suplementoSingle)}) no cuadra con ` +
          `2×single − ${v.acomodacion.toLowerCase()} (esperado ${aString(esperado)}). Se guardó igual.`,
        detalle: { acomodacion: v.acomodacion, valorGuardado: aString(v.suplementoSingle), valorEsperado: aString(esperado) },
      })
    }
  }
  return advertencias
}

// ─── Validaciones compartidas por crear y nueva-version ─────────────────────

function validarModeloYTramos(valores: TarifarioValorInput[], modeloServicio: string): Advertencia[] {
  const modeloPayload = valores[0]!.modelo
  if (modeloPayload !== modeloServicio) {
    throw validacion(
      `El modelo de los valores (${modeloPayload}) no coincide con el modelo de tarifa del servicio (${modeloServicio})`,
    )
  }
  if (modeloPayload === 'TRAMO_PAX') validarTramos(valores)
  return calcularAdvertenciasSuplemento(valores)
}

async function rechazarSiVigenciaSolapada(
  tx: Parameters<typeof repo.tarifariosActivosSolapados>[0],
  proveedorId: number,
  servicioId: number,
  vigenciaDesde: Date,
  vigenciaHasta: Date | undefined,
) {
  const solapados = await repo.tarifariosActivosSolapados(tx, proveedorId, servicioId)
  const choque = solapados.find((t) => seSolapanVigencias(vigenciaDesde, vigenciaHasta ?? null, t.vigenciaDesde, t.vigenciaHasta))
  if (choque) {
    throw conflicto(`Ya existe un tarifario activo (v${choque.version}) para este proveedor y servicio con vigencia solapada (RN-TAR-07)`)
  }
}

// ─── Casos de uso ─────────────────────────────────────────────────────────

export async function listarTarifarios(
  page: number,
  limit: number,
  filtros: { proveedorId?: number; servicioId?: number; vigenteA?: Date; soloActivos?: boolean },
) {
  const { data, total } = await repo.findAllTarifarios(page, limit, filtros)
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function obtenerTarifario(id: number) {
  const tarifario = await repo.findTarifarioById(id)
  if (!tarifario) throw noEncontrado('Tarifario', id)
  return tarifario
}

export async function crearTarifario(input: TarifarioCreateInput, creadoPor: string) {
  return prisma.$transaction(async (tx) => {
    // RN-MAN-05: un proveedor eliminado no puede recibir tarifarios nuevos.
    // Sin este chequeo, un proveedorId inválido caía como P2003 de Prisma
    // (INTERNAL_ERROR sin controlar) en vez de un NOT_FOUND legible.
    const proveedor = await tx.proveedor.findFirst({ where: { id: input.proveedorId, eliminadoEn: null } })
    if (!proveedor) throw noEncontrado('Proveedor', input.proveedorId)

    const servicio = await tx.servicio.findFirst({ where: { id: input.servicioId, eliminadoEn: null } })
    if (!servicio) throw noEncontrado('Servicio', input.servicioId)

    const advertencias = validarModeloYTramos(input.valores, servicio.modeloTarifa)

    await tomarLockPorTexto(tx, LOCK_TARIFARIO_VIGENCIA, `${input.proveedorId}:${input.servicioId}`)
    await rechazarSiVigenciaSolapada(tx, input.proveedorId, input.servicioId, input.vigenciaDesde, input.vigenciaHasta)

    const tarifario = await repo.createTarifarioTx(tx, input, creadoPor, 1)
    return { ...tarifario, advertencias }
  })
}

export async function crearNuevaVersion(id: number, input: TarifarioNuevaVersionInput, creadoPor: string) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.tarifario.findFirst({
      where: { id },
      include: { servicio: { select: { modeloTarifa: true } } },
    })
    if (!anterior) throw noEncontrado('Tarifario', id)
    if (anterior.eliminadoEn) throw conflicto('El tarifario fue eliminado y no admite nuevas versiones')

    // Serializa contra cualquier otra creación/versionado del mismo par.
    await tomarLockPorTexto(tx, LOCK_TARIFARIO_VIGENCIA, `${anterior.proveedorId}:${anterior.servicioId}`)

    // Releer tras el lock: pudo cambiar mientras esperábamos.
    const vigente = await tx.tarifario.findUniqueOrThrow({ where: { id } })
    if (!vigente.activo) {
      throw conflicto('Solo se puede versionar el tarifario activo de la cadena; este ya fue reemplazado por una versión posterior (RN-TAR-06)')
    }

    const advertencias = validarModeloYTramos(input.valores, anterior.servicio.modeloTarifa)

    // RN-TAR-06: desactivar ANTES de chequear solape — la nueva versión no
    // debe chocar contra la que está a punto de reemplazar.
    await repo.desactivarTarifario(tx, id)
    await rechazarSiVigenciaSolapada(tx, anterior.proveedorId, anterior.servicioId, input.vigenciaDesde, input.vigenciaHasta)

    const nueva = await repo.createTarifarioTx(
      tx,
      {
        proveedorId: anterior.proveedorId,
        servicioId: anterior.servicioId,
        moneda: input.moneda ?? anterior.moneda,
        vigenciaDesde: input.vigenciaDesde,
        vigenciaHasta: input.vigenciaHasta,
        valores: input.valores,
      },
      creadoPor,
      anterior.version + 1,
    )

    return { ...nueva, advertencias, versionAnteriorId: anterior.id }
  })
}
