# CLAUDE.md — Sistema de Gestión de Operaciones · Extremo Norte Expediciones (ENE)

> Documento vivo. Actualizar con cada decisión técnica relevante.
> Última actualización: Agosto 2026 · Versión 0.1 · Fase 1

---

## 0. Fuente autoritativa y convenciones canónicas

> **Documentos del proyecto y su autoridad:**
>
> | Documento | Manda sobre |
> |---|---|
> | `Docs/reglas-negocio.md` | Reglas de dominio. Identificadores `RN-XX-NN` |
> | `Docs/plan-implementacion.md` | Orden de construcción, endpoints y criterios de término |
> | `Docs/mantenedores.md` | Campos, validaciones y pantallas de los maestros (etapas 4 y 5) |
> | `CLAUDE.md` (este) | Contrato técnico: stack, estructura, modelo de datos, convenciones |
>
> **`Docs/reglas-negocio.md` es la fuente autoritativa de las reglas de dominio.** Ante cualquier discrepancia, manda ese documento. Cada regla tiene identificador estable (`RN-XX-NN`) para referenciarla desde el código y los tests.
>
> Este `CLAUDE.md` mantiene el **contrato técnico**: contexto, stack, estructura, convenciones, modelo de datos y entorno. Los specs por módulo viven en `Docs/` cuando se escriban y son autoritativos sobre el detalle de contratos de API.

**Convenciones canónicas — heredadas del proyecto FAS y vigentes acá sin cambios:**

- **IDs:** toda tabla lleva `id Int @id @default(autoincrement())`. Cuando se requiere identificación humana se agrega `codigo String` (único según la regla del módulo). **Excepción:** las tablas puente N:N puras (sin más atributos que las dos FK) usan PK compuesta `@@id([aId, bId])` en vez de `id` propio — `ProveedorZona`, `ProveedorTipoServicio`. Un `id` sintético ahí no cumpliría ninguna función.
- **Naming de dominio:** español (`codigo`, `descripcion`, `creadoEn`, `creadoPor`, `eliminadoEn`).
- **Auditoría:** `creadoEn`/`creadoPor`, `actualizadoEn`/`actualizadoPor`, `eliminadoEn`/`eliminadoPor`.
- **Soft delete:** `eliminadoEn DateTime?` en maestros y documentos; filtros `WHERE eliminado_en IS NULL`.
- **Montos y cantidades:** `Decimal`, nunca float. Precisión definida en §5.
- **Autorización:** perfil + ítem de menú + nivel (`SIN_ACCESO`/`LECTURA`/`TOTAL`). No hay enum de roles.
- **Prefijo de API:** `/api/<módulo>` sin versión.
- **Frontend:** route group `(app)` bajo `src/app/`.

---

## 1. Contexto del proyecto

**Cliente:** Extremo Norte Expediciones — operador de turismo receptivo y eventos corporativos en Chile, desde Arica hasta la zona central.

**Dos áreas de negocio, un solo flujo:**

| | Turismo receptivo | Eventos empresa |
|---|---|---|
| Cliente | Agencias de viajes | Empresas |
| Moneda de venta | USD | CLP |
| Horizonte | Hasta más de 12 meses | Acotado |

No existen clientes persona natural. El área de negocio es un **atributo de la operación**, no un flujo separado: comparte costeo, OT y órdenes de compra.

**Objetivo:** reemplazar la operación actual en planillas Excel, carpetas de Drive y correo por un sistema que lleve el ciclo completo — cotización, Orden de Trabajo, órdenes de compra, facturación y reportería.

**Operado por:** VIAIN Asesorías Informáticas. El cliente no tiene equipo TI interno.

**Usuarios (fase 1):** Francisco Leyton (jefe de operaciones y reservas), Paula Pinheiro (coordinación administrativa), Carolina Demaría (eventos corporativos), Lorena Baeza (administración), Marcela Piddo (gerencia).

**Documentos de origen:** `Docs/reglas-negocio.md` (reglas de dominio, autoritativo), propuesta funcional v3 y carta Gantt fase 1.

---

## 2. Repositorios

| Repo | Descripción | Path local |
|---|---|---|
| `ene-api` | Backend Fastify + Prisma | `~/sites/ENE/ene-api` |
| `ene-web` | Frontend Next.js | `~/sites/ENE/ene-web` |

Monorepo con `docker-compose.yml` en la raíz, igual que FAS.

---

## 3. Stack tecnológico

Idéntico a FAS salvo lo indicado. **No se introduce ninguna tecnología nueva**: el plan de fase 1 son 32 días hábiles con un desarrollador y no hay margen para curva de aprendizaje.

### ene-api (Backend)

| Componente | Versión | Notas |
|---|---|---|
| Node.js | 22 LTS | ESM, `type: module` |
| TypeScript | 5.x | |
| Fastify | 5 | `@fastify/cors`, `helmet`, `multipart`, `swagger`, `swagger-ui` |
| PostgreSQL | 17 | |
| Prisma | 5.22 | |
| Better Auth | 1.6 | |
| Zod | 4 | Validación request/response |
| decimal.js | 10 | **Obligatorio** para todo monto (§7) |
| Playwright | 1.62 | Motor de documentos — render PDF |
| ExcelJS | 4 | Exportaciones |
| Resend | 6 | Correo transaccional |
| dayjs | 1.11 | Fechas, timezone `America/Santiago` |
| Pino | 10 | Logging |
| Vitest | 4 | Tests |

**BullMQ sigue sin código en fase 1:** no hay trabajo asíncrono construido —el correo, los avisos programados y las reconfirmaciones son fase 2—. **Redis sí está habilitado desde el 28-ago-2026** (decisión: QA y producción deben tener la misma topología desde el arranque, para no rehacer el `docker-compose` cuando entre BullMQ). El servicio `redis` está activo en `docker-compose.yml` (desarrollo) y en `docker-compose.qa.yml` (Coolify), con `REDIS_URL` disponible en `ene-api`; el código de la cola en sí todavía no existe.

### ene-web (Frontend)

Base: fork del mismo `next-shadcn-dashboard-starter` usado en FAS, con las mismas reglas de adaptación.

| Componente | Versión |
|---|---|
| Next.js | 16 App Router |
| React | 19 |
| Tailwind | v4 |
| shadcn/ui + Radix | — |
| TanStack Query / Table / Form | v5 / v8 / v1 |
| ky | 2 |
| Better Auth (cliente) | 1.6 |
| nuqs, sonner, next-themes, recharts | — |

**Reglas de adaptación del template (obligatorias):**
1. Arrancar Clerk por completo y reemplazar por Better Auth contra `ene-api`. **No copiar `@clerk/nextjs`** — en `fas-web` quedó como residuo, acá no entra.
2. No usar Server Actions ni el fetch de Next para datos de negocio. TanStack Query + ky contra `ene-api`.
3. Reemplazar el sidebar de ejemplo por la estructura real de ítems de menú y perfiles.
4. Eliminar módulos del template no usados (kanban, e-commerce).
5. Theming por CSS variables, remarcado a identidad Extremo Norte.

### Infraestructura

Docker, GitHub Actions, VPS con Coolify. Servicios de desarrollo: `postgres`,
`pgadmin`, `api`, `web`, `redis` (§3: sin código de cola todavía, solo
infraestructura). QA/producción (`docker-compose.qa.yml`): `postgres`,
`redis`, `api`, `web` — sin `pgadmin`.

---

## 4. Estructura de directorios

### ene-api

```
ene-api/
├── src/
│   ├── config/
│   ├── lib/                    # prisma, auth, crypto, mailer, storage
│   ├── plugins/                # auth-guard, error-handler, swagger
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── config/             # mantenedores generales
│   │   │   ├── perfiles/
│   │   │   ├── usuarios/
│   │   │   ├── zonas/
│   │   │   └── prefijos-codigo/
│   │   ├── clientes/           # agencias y empresas + ejecutivos
│   │   ├── grupos/             # pasajeros y grupos
│   │   ├── proveedores/
│   │   ├── servicios/          # catálogo + tipos de servicio
│   │   ├── tarifas/            # tarifarios y sus valores
│   │   ├── cotizaciones/
│   │   ├── ordenes-trabajo/
│   │   ├── ordenes-compra/
│   │   ├── facturacion/        # adaptador DTE
│   │   ├── cobros/             # cuenta corriente cliente y pagos proveedor
│   │   ├── adjuntos/
│   │   ├── documentos/         # motor de documentos (portado de FAS)
│   │   ├── dashboard/          # radar de OT
│   │   └── health/
│   ├── shared/                 # pagination, errors, types, rut-validator,
│   │                           # advisory-locks, pdf/, dinero/, versionado/
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   ├── seed-zonas.ts
│   └── bootstrap-admin.ts
└── tests/
```

### Estructura de cada módulo

Idéntica a FAS:

```
modulo/
├── modulo.routes.ts       # Rutas Fastify
├── modulo.controller.ts   # Thin — solo orquesta
├── modulo.service.ts      # Lógica de negocio
├── modulo.repository.ts   # Queries Prisma
├── modulo.schema.ts       # Zod
└── modulo.types.ts
```

### ene-web

```
ene-web/src/
├── app/
│   ├── (auth)/
│   └── (app)/
│       ├── cotizaciones/
│       ├── ordenes-trabajo/
│       ├── ordenes-compra/
│       ├── facturacion/
│       ├── cobros/
│       ├── dashboard/
│       └── config/
├── components/{ui,shared,modules}/
├── features/
├── lib/{api.ts,auth.ts,dinero.ts,utils.ts}
└── hooks/
```

---

## 5. Modelo de datos

### Precisiones decimales (canónicas)

| Concepto | Tipo |
|---|---|
| Montos (costo, venta, pagos) | `Decimal @db.Decimal(18, 4)` |
| Porcentaje de margen | `Decimal @db.Decimal(7, 4)` — `0.5000` = 50% |
| Tipo de cambio | `Decimal @db.Decimal(12, 6)` |
| Cantidades de pasajeros | `Int` |

### Maestros

```
Cliente            tipo(AGENCIA|EMPRESA), codigo, razonSocial, rut,
                   nombreComercial, paisId, monedaHabitual, formaPagoId,
                   condicionPagoId
ClienteEjecutivo   clienteId, nombre, email, telefono, cargo, descripcion,
                   esRepresentanteLegal
ClienteDireccion   clienteId, etiqueta, descripcion, paisId, comunaId?,
                   direccion, esPorDefecto
Grupo              codigo, apellido*, clienteId, nacionalidad, paisOrigen,
                   idioma, cantidadPax        (* identificador operativo)
Pasajero           grupoId, nombre, edad, nacionalidad, restricciones,
                   documento
Proveedor          codigo, razonSocial, rut, nombreComercial,
                   formaPagoId, condicionPagoId, politicaCancelacion
ProveedorTipoServicio proveedorId, tipoServicioId  # N:N — un proveedor pertenece a varios tipos de servicio
ProveedorZona      proveedorId, zonaId       # N:N — un proveedor opera en varias zonas
ProveedorAlias     proveedorId, alias        # nombre interno / glosa bancaria
ProveedorCuenta    proveedorId, banco, tipoCuenta, numeroCuenta, titular, rut
ProveedorContacto  proveedorId, nombre, email, telefono, cargo, descripcion,
                   esRepresentanteLegal, esEjecutivo
ProveedorDireccion proveedorId, etiqueta, descripcion, paisId, comunaId?,
                   direccion, esPorDefecto
Zona               codigo, nombre, nombreEn
TipoServicio       codigo, nombre, modeloTarifaDefault
Servicio           codigo, nombre, nombreEn, descripcion, descripcionEn,
                   zonaId, tipoServicioId, modeloTarifa, margenSugerido,
                   duracionDias

# Extensión Etapa 4 (29-ago-2026) — geografía y pago, RN-GEO-*/RN-PAG-*
Pais               codigo, nombre, esPaisNacional     # solo Chile = true
Region             codigo, nombre
Provincia          codigo, nombre, regionId
Comuna             codigo, nombre, provinciaId
FormaPago          codigo, nombre                     # catálogo único Cliente/Proveedor
CondicionPago      codigo, nombre                      # catálogo único Cliente/Proveedor
CondicionPagoCuota condicionPagoId, numeroCuota, porcentaje, plazoDias
```

### Tarifas

Tres modelos de tarifa conviven en una sola tabla de valores con discriminador.

```
enum ModeloTarifa { TRAMO_PAX | ACOMODACION | UNITARIO_PAX }
enum Acomodacion  { SINGLE | DOBLE | TWIN | TRIPLE }

Tarifario        proveedorId, servicioId, moneda, vigenciaDesde,
                 vigenciaHasta, version, activo
TarifarioValor   tarifarioId, modelo,
                 paxDesde?, paxHasta?,        # TRAMO_PAX
                 acomodacion?,                # ACOMODACION
                 valor, suplementoSingle?
```

Reglas: `TRAMO_PAX` → el valor cubre el servicio completo para el rango. `ACOMODACION` → valor por habitación según ocupación, con suplemento single guardado como **valor propio** (no derivado). `UNITARIO_PAX` → valor × cantidad de pasajeros.

### Cotización

```
enum EstadoCotizacion { BORRADOR | ENVIADA | EN_NEGOCIACION | APROBADA
                      | PERDIDA | DESISTIDA }

Cotizacion         numero, clienteId, ejecutivoId, grupoId, areaNegocio,
                   zonaId, fechaOperacion, cantidadPax, idiomaDocumento,
                   moneda, tipoCambio, estado, versionVigenteId,
                   ordenTrabajoId?
CotizacionVersion  cotizacionId, version, motivo, costoTotal, margenTotal,
                   ventaTotal, creadoEn, creadoPor
CotizacionLinea    cotizacionVersionId, dia, bloque(AM|PM), orden,
                   tipoLinea(ESTANDAR|OTRO),
                   servicioId?, proveedorId?, tarifarioValorId?,
                   descripcion, descripcionEn, cantidadPax, acomodacion?,
                   costoUnitario, costoTotal, margenPct, ventaTotal
```

### Orden de Trabajo

> **Decisión canónica.** La cotización aprobada **genera** la OT copiando sus líneas. Son dos modelos, no uno con estados. Razón: la línea base congelada exige una copia de todos modos, y separarlos deja limpios los dos flujos de versiones — la negociación comercial por un lado, las modificaciones operativas por otro. Las cotizaciones perdidas no ocupan numeración de OT. En la interfaz se presenta como "la cotización se convirtió en la OT", que es el lenguaje del negocio.

```
enum EstadoOT { CONFIRMADA | EN_ESPERA | EN_PREPARACION | EN_OPERACION
              | EJECUTADA | CERRADA | CANCELADA | NO_SHOW }

OrdenTrabajo         numero, cotizacionId, clienteId, ejecutivoId, grupoId,
                     apellido*, areaNegocio, zonaId, fechaOperacion,
                     cantidadPax, moneda, tipoCambioCotizacion,
                     estado, versionVigenteId
OrdenTrabajoVersion  ordenTrabajoId, version, motivo, tipoCambio
                     (ALCANCE|CORRECCION), costoTeoricoTotal, margenTotal,
                     ventaTotal, creadoEn, creadoPor
OrdenTrabajoLinea    ordenTrabajoVersionId, dia, bloque, orden, tipoLinea,
                     servicioId?, proveedorId?, descripcion, descripcionEn,
                     cantidadPax, acomodacion?, costoTeorico, margenPct,
                     ventaLinea, estadoServicio
enum EstadoServicio  { PENDIENTE | TENTATIVO | CONFIRMADO | RECHAZADO
                     | CANCELADO }
```

`OrdenTrabajoVersion.version = 1` es la **línea base congelada** al aprobar. Toda comparación de costo teórico contra real usa la versión 1.

### Órdenes de compra

```
enum EstadoOC { BORRADOR | EMITIDA | MODIFICADA | ANULADA }

OrdenCompra         numero, ordenTrabajoId, proveedorId, moneda, estado,
                    versionVigenteId, fechaEmision
OrdenCompraVersion  ordenCompraId, version, ordenTrabajoVersionId, motivo,
                    montoTotal, creadoEn, creadoPor
OrdenCompraLinea    ordenCompraVersionId, ordenTrabajoLineaId, descripcion,
                    fechaServicio, cantidadPax, costoReal, moneda
```

Una OT tiene 0..n OC. Cada `OrdenCompraVersion` referencia la versión de OT contra la que se emitió.

### Facturación y cobros

```
enum TipoDTE       { FACTURA_AFECTA | FACTURA_EXENTA | BOLETA | NOTA_CREDITO }
enum EstadoDTE     { PENDIENTE | EMITIDO | RECHAZADO | ANULADO }
enum TipoMovimiento{ ABONO | FACTURA | PAGO | NOTA_CREDITO | AJUSTE }

DocumentoTributario  ordenTrabajoId, tipo, folio, fechaEmision, moneda,
                     neto, iva, total, tipoCambioEmision, estadoDte,
                     proveedorDte, urlPdf, urlXml, respuestaJson
MovimientoCuenta     clienteId, ordenTrabajoId?, tipo, fecha, moneda, monto,
                     tipoCambio, montoClp, documentoTributarioId?, glosa
FacturaProveedor     proveedorId, ordenCompraId, numero, fechaEmision,
                     moneda, monto, adjuntoId, estado
PagoProveedor        proveedorId, ordenCompraId?, facturaProveedorId?,
                     tipo(ABONO|PAGO), fecha, moneda, monto, tipoCambio,
                     referencia, comprobanteAdjuntoId
```

El saldo de cuenta corriente **se calcula, no se almacena**. Vista `rpt_cuenta_corriente_cliente` con saldo acumulado por `ROW_NUMBER`.

### Adjuntos

```
enum EntidadAdjunto { ORDEN_TRABAJO | ORDEN_COMPRA | COTIZACION
                    | FACTURA_PROVEEDOR | PAGO_PROVEEDOR }

Adjunto  entidad, entidadId, nombreArchivo, mimeType, tamanoBytes,
         storageKey, creadoEn, creadoPor
```

Almacenamiento en filesystem del VPS bajo `/data/adjuntos/{entidad}/{entidadId}/`, servido por la API con control de permiso. **Nunca exponer el path directo.**

### Usuarios y permisos

Portar tal cual el modelo de FAS: `Usuario`, `Perfil`, `ItemMenu`, `PerfilItemMenu(nivel)`. Perfiles iniciales: `GERENCIA`, `OPERACIONES`, `ADMINISTRACION`, `ADMINISTRADOR`. El perfil `PROVEEDOR` se agrega en fase 2 con el portal.

---

## 6. API REST — convenciones

- **Prefijo:** `/api/<módulo>` sin versión. Ej.: `/api/cotizaciones`, `/api/ordenes-trabajo`, `/api/tarifas`.
- **Auth:** sesión Better Auth; autorización por perfil + ítem de menú + nivel.
- **Paginación:** `?page=1&limit=20` → `{ data, meta: { total, page, limit, totalPages } }`.
- **Errores:** `{ error: { code, message, details? } }`.
- **Fechas:** ISO 8601. **Montos:** string decimal, nunca float.
- **Filtros de listado:** `?q=` búsqueda libre, `?estado=`, `?desde=&hasta=`.

### Endpoints característicos

```
POST  /api/cotizaciones                      crea borrador
POST  /api/cotizaciones/:id/versiones        nueva versión de negociación
POST  /api/cotizaciones/:id/aprobar          → genera OT (transacción)
GET   /api/cotizaciones/:id/preview          HTML del documento
POST  /api/documentos/emitir                 { tipo, documentoId, idioma }

GET   /api/ordenes-trabajo?estado=EN_ESPERA
POST  /api/ordenes-trabajo/:id/versiones     { tipoCambio, motivo, lineas }
PATCH /api/ordenes-trabajo/:id/lineas/:lid/estado-servicio

POST  /api/ordenes-compra                    { ordenTrabajoId, proveedorId }
POST  /api/ordenes-compra/:id/emitir         valida correspondencia

POST  /api/facturacion/:otId/emitir          adaptador DTE
POST  /api/cobros/abonos                     abono contra OT sin factura
GET   /api/cobros/cuenta-corriente/:clienteId

GET   /api/dashboard/radar?ventana=30
```

---

## 7. Reglas de negocio críticas

> Resumen operativo. El detalle completo, con identificadores y casos de prueba obligatorios, está en **`Docs/reglas-negocio.md`**.

### Dinero — la regla más importante

**Ningún monto se convierte nunca a `number` de JavaScript.** Prisma entrega `Decimal`; toda aritmética usa `decimal.js`; la API responde string. Hay margen por línea, dos monedas y tipo de cambio en dos momentos distintos: un redondeo mal puesto se nota en el cierre.

Helper obligatorio en `shared/dinero/`: `sumar`, `multiplicar`, `aplicarMargen`, `convertir`, `redondear`. **Prohibido `parseFloat` sobre montos.**

### Costeo

- **El margen es un porcentaje sobre el costo (markup):** `venta = costo × (1 + margen)`. No es margen sobre la venta. Costo 3.000.000 con margen 50% → venta 4.500.000.
- El valor de venta de la OT es la **suma de sus líneas valorizadas**. El margen puede aplicarse global o diferenciado por línea; el porcentaje se guarda **siempre en la línea**, aunque venga de un valor global.
- El **tarifario es ayuda de captura**. Una vez cargado, `costoTeorico` queda plasmado en la línea y **no cambia** aunque el maestro de tarifas se modifique después.
- Cambiar la cantidad de pasajeros **recalcula todas las líneas**: con tarifas por tramo el costo salta escalonado, no proporcional.
- Las líneas `OTRO` llevan descripción y valor digitados; no referencian tarifario.

### Cotización y OT

- Una cotización `APROBADA` no se edita. Genera OT y queda inmutable.
- Una cotización `PERDIDA` no genera OT ni consume numeración de OT.
- El **apellido del grupo es obligatorio** en la OT y es su identificador operativo visible.
- Numeración: `COT-{YYYY}-{NNNN}` y `OT-{YYYY}-{NNNN}`, correlativos por año, más número de versión independiente.
- **Cambio de alcance ≠ desviación de costo.** Solo el cambio de alcance —el cliente agrega, quita o modifica servicios— genera nueva versión con nueva venta. Una diferencia de costo del mismo servicio **no toca la venta**: absorbe el margen. Toda `OrdenTrabajoVersion` declara `tipoCambio`.
- Una OT `CANCELADA` no pasa a cierre como servicio realizado, salvo `NO_SHOW`.

### Órdenes de compra

- La OC no se emite si no cuadra con la OT vigente en servicio, fecha, pasajeros y tarifa. La validación **bloquea**, no advierte.
- `OrdenCompraVersion` guarda contra qué `ordenTrabajoVersionId` se emitió.
- El costo real de la operación es la suma de las líneas de OC vigentes, comparada contra la versión 1 de la OT.

### Moneda y tipo de cambio

- Receptivo se cotiza y cobra en **USD**; eventos en **CLP**. La OT se denomina en la moneda de su cotización.
- Se guardan dos tipos de cambio: `tipoCambioCotizacion` (histórico, deriva el precio) y el del cobro efectivo en cada `MovimientoCuenta`. **Nunca se recalculan.**
- **Todo el análisis de gestión se expresa en pesos.** Las vistas de reportería convierten con el TC del movimiento cuando existe, y con un TC de referencia parametrizable mientras la OT está abierta.

### Facturación

- Adaptador DTE genérico, mismo patrón que FAS: `DTE_PROVIDER=mock|chilesystems|simplefactura` en `src/modules/facturacion/dte.adapter.ts`.
- En desarrollo usar siempre el mock.
- Un abono puede recibirse **contra la OT sin que exista factura**. Al emitirla, se aplica contra los abonos disponibles del cliente.
- La factura de proveedor se adjunta a la OT referenciando su OC. La comparación de valores se muestra lado a lado; **la validación de la diferencia es humana, no automática.**

### Versionado — mecanismo compartido, etapa 1

> **Cambio acordado en la reunión con el cliente:** el versionado de OT y OC se construye en la **etapa 2**, como mecanismo transversal en `shared/versionado/`, con cuatro días propios. Las etapas posteriores lo consumen, no lo reinventan.

Contrato único para Cotización, OT y OC (detalle en `Docs/reglas-negocio.md` §5):

- Cabecera estable → N versiones → líneas colgando de la versión.
- Una versión existente **nunca se edita ni se borra**: modificar es crear la siguiente copiando las líneas.
- `version` correlativo desde 1 sin saltos; `versionVigenteId` apunta a exactamente una.
- Crear versión es **transaccional y serializado** con advisory lock.
- Consultar una versión histórica devuelve el documento tal como estaba, no reconstruido desde los maestros actuales.
- Toda versión de OT posterior a la 1 declara `tipoCambio`: `ALCANCE` recotiza y cambia la venta; `CORRECCION` no la toca.
- La **versión 1 de la OT es la línea base congelada**; toda desviación se mide contra ella.

> **Cierre etapa 2 (agosto 2026).** `shared/versionado/` operativo para Cotización, OT y OC: núcleo genérico + tres adaptadores concretos en `adaptadores/`, con lectura histórica (RN-VER-09) y línea base (RN-VER-12). Namespaces de lock 491006/491007/491008. Validaciones bloqueantes en el adaptador de OT: `CORRECCION` no cambia venta (RN-VER-10) ni costo (RN-VER-11). **Decisión de alcance:** la aprobación del cliente para un `ALCANCE` queda como gate mínimo (booleano `aprobadoPorCliente`); el flujo de aprobación **verificable y persistente** se construye en la **etapa 8 (OT)** —hallazgo QA-VER-001 diferido a propósito, ver árbitro Codex ronda 2—.

### Correlativos

Generar dentro de transacción con `pg_advisory_xact_lock`. Namespaces propios de ENE, sin colisión con los de FAS:

```
491001  Cotizacion correlativo
491002  OrdenTrabajo correlativo
491003  OrdenCompra correlativo
491004  DocumentoTributario folio interno
491005  Emisión idempotente de documentos
491006  Versionado de OT (serializa dos POST /versiones concurrentes)
491007  Versionado de Cotizacion (clave: cotizacionId)
491008  Versionado de OrdenCompra (clave: ordenCompraId)
491009  Correlativo de código de maestro — Cliente/Proveedor/Grupo/Servicio
        (namespace compartido entre las cuatro entidades, clave: hashtext(entidad))
```

> **Cierre etapa 4 (agosto 2026).** Los seis mantenedores generales (Zona, TipoServicio,
> Cliente + Ejecutivo, Servicio, Grupo + Pasajero, Proveedor + Alias/Cuenta/Contacto)
> con CRUD completo, permisos por `MAESTROS` y patrón `QuickCreate` (RN-QC) para los
> cinco pares confirmados: Grupo→Cliente, Proveedor→TipoServicio, Proveedor→Zona,
> Servicio→TipoServicio, Servicio→Zona.
>
> **Decisiones de esta etapa:**
> - Correlativo real (RN-COR-01/RN-MAN-02) para CLIENTE/PROVEEDOR/GRUPO/SERVICIO en
>   `shared/correlativos.ts`, namespace 491009: solo incrementa `ultimoValor` si el
>   código enviado coincide con el sugerido recalculado dentro del lock; si el
>   usuario lo edita, no se toca el contador (evita huecos) y la unicidad la
>   garantiza el `@unique` de la tabla. Formato sin guión (`CL0001`, no `CL-0001`),
>   a diferencia de la sugerencia en vivo de PERFIL/USUARIO (RN-PER-07, con guión).
> - `Proveedor.rut`: el `@unique` de Prisma se reemplazó por un índice único
>   parcial en SQL crudo (`WHERE rut <> '55555555-5'`) para permitir que el RUT
>   genérico de proveedores extranjeros sin RUT real (RN-PRV-01) se repita entre
>   proveedores distintos. `Proveedor.tipoServicioId` y `Cliente.pais` pasaron a
>   `NOT NULL` (coincidía con la spec pero no con el schema de etapa 1).
> - Extensión `unaccent` de Postgres (migración, no dependencia npm) para
>   búsqueda insensible a mayúsculas y acentos (RN-MAN-06, RN-PRV-02) vía
>   `shared/busqueda.ts` (`idsPorTexto`), combinada con el resto de filtros
>   tipados de Prisma vía `id: { in: ... }`.
> - `ProveedorAlias/Cuenta/Contacto` ganaron auditoría completa
>   (`creadoEn/creadoPor/eliminadoEn/eliminadoPor`), igual que `ClienteEjecutivo`
>   y `Pasajero` — las 5 subtablas de maestros usan soft delete con `DELETE`
>   propio, no borrado físico. `Zona`, `TipoServicio` y `Grupo` sumaron
>   `actualizadoEn/actualizadoPor` para quedar parejos con el resto de maestros.
> - Guard genérico `shared/operaciones-abiertas.ts` (RN-MAN-04): cotización no
>   cerrada, OT en cualquier estado salvo `CERRADA`, OC vigente (no `ANULADA`).
>   Reutilizado por el soft delete de Cliente/Proveedor/Grupo/Servicio/Zona y por
>   RN-CLI-04 (último ejecutivo activo). TipoServicio usa un guard propio más
>   simple (referencial: servicios/proveedores vigentes que lo usan).
> - **Hallazgo de implementación:** los `<Select>` con `QuickCreate` anidado
>   deben ignorar valores no numéricos en `onValueChange`
>   (`Number.isFinite(id)`) — Radix puede disparar el evento con un valor no
>   parseable al remontar `SelectContent` cuando la lista de opciones se
>   refresca tras crear un registro al vuelo, lo que sin el guard resetea el
>   campo a `NaN` y bloquea el submit en silencio. Al fijar el valor recién
>   creado desde el callback `onCreated`, usar `form.setFieldValue` (API del
>   form de nivel superior) en vez de `field.handleChange` del closure del
>   render-prop, que corre después del ciclo de vida async del diálogo hijo.
>
> **QA Codex ronda 1 (correcciones aplicadas):** `findXById` de los seis
> maestros dejó de filtrar `eliminadoEn` (RN-MAN-05 — accesible por id aunque
> esté eliminado); las mutaciones (`actualizar*`/`eliminar*`/alta de
> subrecursos) ahora exigen el registro vigente vía `obtener<Entidad>Vigente`.
> RN-SRV-02 cuenta cualquier tarifario del servicio, activo o no. RN-CLI-02
> expone `tieneOperaciones` en `GET /api/clientes/:id` y el frontend confirma
> antes de cambiar el `tipo` de un cliente con operaciones. El país se
> precarga con "Chile" al elegir `EMPRESA`. `ClienteEjecutivo`, `Pasajero`,
> `ProveedorCuenta` y `ProveedorContacto` suman `actualizadoEn/actualizadoPor`.
>
> **QA Codex ronda 3 (corrección aplicada):** RN-CLI-02 pasó a un indicador
> propio (`tieneAlgunaOperacion`, cualquier cotización u OT del cliente, sin
> filtrar por estado) — ya no reutiliza el guard de operaciones *abiertas* de
> RN-MAN-04. RN-PRV-03: la unicidad de `ProveedorAlias.alias` ahora la
> garantiza un índice único parcial insensible a mayúsculas
> (`lower(alias) WHERE eliminadoEn IS NULL`), no solo el prechequeo de
> servicio — cierra la condición de carrera entre requests concurrentes y los
> duplicados dentro del mismo payload de alta. El P2002 de esa violación se
> traduce a `CONFLICT` en el service.
>
> **Tests obligatorios de la etapa cerrados (28-ago-2026).** 9 archivos nuevos en
> `ene-api/tests/` (94 tests): `rut-validator`, `busqueda` (RN-MAN-06 vía
> `unaccent`), `zonas`, `tipos-servicio`, `correlativos` (RN-COR-01/RN-MAN-02:
> consumo del contador solo si el código coincide con la sugerencia, sin huecos
> si se edita, y la carrera de dos altas con la misma sugerencia resuelve en un
> ganador + un `CONFLICT`, nunca en un salto ni un duplicado), `clientes`,
> `grupos`, `proveedores` (incluye la carrera de dos altas con el mismo alias) y
> `servicios`. Los tests de correlativo viven en un archivo propio y separado de
> los de cada maestro a propósito: el contador de `PrefijoCodigo` es una fila
> compartida por entidad, y los tests de CRUD de cada módulo usan siempre
> códigos explícitos que nunca calzan con la sugerencia viva, para no competir
> por la misma fila con el test de concurrencia. 105 tests en total sin
> regresiones (`npx vitest run`).
>
> **Permisos por mantenedor, no por bloque (28-ago-2026).** Hasta acá los seis
> mantenedores generales compartían un único `ItemMenu` (`MAESTROS`, ruta
> `/config`): un perfil solo podía dar un nivel para el bloque completo, no
> uno distinto por mantenedor. Se separó en seis ítems propios —`CLIENTES`,
> `GRUPOS`, `PROVEEDORES`, `SERVICIOS`, `ZONAS`, `TIPOS_SERVICIO`, rutas
> `/config/<recurso>`— para permitir, por ejemplo, `TOTAL` en Proveedores y
> `LECTURA` en Clientes en el mismo perfil. `MAESTROS` sigue existiendo pero
> ahora gobierna solo lo que no tiene ítem propio: el índice `/config` y
> Prefijos de código (no es uno de los "seis mantenedores generales" de la
> Etapa 4, se mantiene bajo `MAESTROS`). `resolverNivelPorRuta`
> (`menu-acceso-context.tsx`) ya resuelve por la ruta más específica, así que
> no hubo que tocar `nav-config.ts` ni la matriz de permisos del frontend
> (100% data-driven desde `GET` de ítems de menú): solo cambió el `ITEM` que
> cada `*.routes.ts` exige (`requireLevel`) y el código que cada componente de
> feature usa en `usePuedeEscribir`/`QuickCreateTrigger`. El seed hace un
> backfill idempotente: cualquier perfil con un nivel ya configurado a mano en
> `MAESTROS` lo hereda en los seis ítems nuevos, para no revocar acceso en
> silencio a `OPERACIONES`/`ADMINISTRACION` si ya estaban ajustados.
>
> **Extensión Etapa 4 — geografía, direcciones y pago (29-ago-2026).**
> `Cliente.condicionesPago` y `Proveedor.condicionesPago` (texto libre) se
> reemplazan por `formaPagoId`/`condicionPagoId`, dos catálogos únicos
> compartidos (`RN-PAG-01`) sembrados con datos iniciales. `CondicionPago`
> agrega cronograma de cuotas (`CondicionPagoCuota`), validado a que sume
> exactamente 100% (`RN-PAG-02`). Se agrega `ClienteDireccion`/
> `ProveedorDireccion`, direcciones múltiples con `esPorDefecto` exclusivo por
> dueño (`RN-GEO-03`) y `comunaId` obligatorio solo si el país es Chile
> (`RN-GEO-02`, `Pais.esPaisNacional`). Geografía nueva: `Pais` (lista plana,
> editable) y, solo para Chile, `Region → Provincia → Comuna` (`RN-GEO-01`,
> geografía porteada de FAS igual que las Zonas de Etapa 1). Seis mantenedores
> nuevos con `ItemMenu` propio: `PAISES`, `REGIONES`, `PROVINCIAS`, `COMUNAS`,
> `FORMAS_PAGO`, `CONDICIONES_PAGO` — mismo patrón que los seis de Etapa 4, sin
> etapa propia en `Docs/plan-implementacion.md` (decisión: se registra como
> anexo de Etapa 4, no como etapa nueva). Migración destructiva
> (`DROP COLUMN condicionesPago`) aceptada sin backfill: no había datos reales
> cargados todavía. Pendiente al cerrar este anexo: capa frontend en `ene-web`
> (mantenedores nuevos + bloque Direcciones en los formularios de Cliente y
> Proveedor) — quedó truncada en un corte de sesión anterior y se completa
> ahora.
>
> **QA Codex ronda 1 del anexo (30-ago-2026), correcciones aplicadas:**
> `condiciones-pago.schema.ts` sumaba porcentajes con `number` de JS y
> redondeaba el total — `33.333×3` se veía como 100% pero `Decimal(5,2)`
> persistía 99.99; ahora cada cuota se limita a 2 decimales y la suma se
> valida en centésimos enteros (mismo criterio en el espejo de UI). RN-GEO-03:
> el desmarcar-y-crear en transacción no cerraba la carrera cuando el dueño no
> tenía ningún default todavía (dos altas concurrentes podían confirmar dos
> defaults) — se agregó índice único parcial (`direccion_default_unico_parcial`,
> mismo patrón que `proveedor_alias_unico_parcial`) y su `P2002` se traduce a
> `CONFLICT` en el service. `Pais.esPaisNacional` dejó de ser editable vía API
> (alta/edición) — es un hecho estructural fijado solo por el seed, no un
> campo de mantenedor (RN-GEO-01). Los 6 `ItemMenu` nuevos se agregaron a
> `MANTENEDORES_SEPARADOS` en `seed.ts`: sin esto no heredaban el nivel ya
> configurado en `MAESTROS`, y `OPERACIONES`/`ADMINISTRACION` habrían quedado
> sin poder leer los selectores de País/Comuna/Forma de pago en los
> formularios de Cliente/Proveedor. **Decisión adicional del usuario:**
> `Cliente.pais` (texto libre) se unificó con `Cliente.paisId` (FK a `Pais`,
> mismo catálogo que usan las Direcciones) — migración destructiva sin
> backfill (0 filas reales), con Select + `PaisQuickCreate` reemplazando el
> campo de texto en `cliente-form.tsx` y `cliente-quick-create.tsx`. Esa
> unificación rompió los fixtures de Cliente en 8 archivos de test (`pais:
> 'Chile'/'Perú'` ya no compila contra Prisma) — corregidos resolviendo el id
> real vía `prisma.pais.findUniqueOrThrow({ where: { codigo: 'CHL'|'PER' } })`
> en cada suite en vez de asumir un id fijo.
>
> **Cierre del anexo (30-ago-2026):** ciclo QA-Codex cerrado en ronda 3,
> `APROBADO_CON_OBSERVACIONES` → `TESTS_OK` (105/105 tests, build API y web
> limpios). Los 11 errores/5 advertencias de ESLint en `ene-web` son deuda
> preexistente fuera de este alcance, sin archivos modificados aquí.
>
> **QA-TEST-001 cerrado (31-ago-2026).** Los 3 casos obligatorios de la
> sección 16 de `Docs/reglas-negocio.md` se agregaron fuera del ciclo QA-Codex
> normal, a pedido explícito del usuario (por regla el ciclo no permite que
> Claude escriba tests, para no comprometer la independencia de la
> verificación) — `tests/direcciones.test.ts` (RN-GEO-02, RN-GEO-03, vía
> `crearCliente`/`crearDireccion`/`actualizarDireccion`, alcanza para probar
> la regla compartida sin duplicar el caso en Proveedor) y
> `tests/condiciones-pago.test.ts` (RN-PAG-02, contra
> `condicionPagoCreateSchema` directo — la regla vive solo en el schema Zod,
> no en el service). 112 tests en total.
>
> **Ajustes de UX y modelo tras feedback de usuario (31-ago-2026).**
> `ClienteEjecutivo`/`ProveedorContacto` ganan `descripcion` (texto libre) y
> `esRepresentanteLegal` — máximo uno por dueño, mismo patrón de índice único
> parcial que `esPorDefecto` en Direcciones (`RN-CLI-05`, `RN-PRV-06`).
> `ProveedorContacto` además suma `esEjecutivo` (sin exclusividad, para
> seleccionar el contacto al asignar el proveedor en la OT — Etapa 8,
> `RN-PRV-07`). `ClienteDireccion`/`ProveedorDireccion` suman `descripcion`
> como campo libre adicional a `etiqueta`. `Proveedor.tipoServicioId` (FK
> única) pasa a `ProveedorTipoServicio` (N:N, mismo criterio que
> `ProveedorZona`/RN-PRV-05) — un proveedor puede pertenecer a varios tipos de
> servicio, mínimo uno (`RN-PRV-08`). `ProveedorContactosCard` ganó su primer
> diálogo de edición (antes solo alta/baja). La migración sí hace backfill
> (`INSERT ... SELECT` desde `proveedor.tipoServicioId` antes de eliminar la
> columna) aunque hoy no había filas reales que perder — la migración queda
> segura para cualquier ambiente, no solo el actual. Orden de campos unificado entre
> `cliente-form.tsx`/`proveedor-form.tsx` (identidad → clasificador propio →
> contacto → términos comerciales) y `nombre` pasó a ser el segundo campo de
> `servicio-form.tsx`, junto a `codigo`.

---

## 8. Motor de documentos

**Se porta desde FAS sin rediseñar.** Copiar `src/modules/documentos/` completo más `shared/pdf/`:

- `documentos.registry.ts` — registro central; agregar un documento es agregar una entrada
- `resolvers/` — arman el payload desde la BD
- `schemas/` — validación Zod del payload
- `templates/<tipo>/v1/index.tsx` — plantillas React versionadas
- `ui/` — `Encabezado`, `TablaLineas`, `BloqueTotales`, `PieFirma`, `GrupoCampos`, `tokens`, `print-css`, `formato`
- `shared/pdf/render.ts` — Playwright con `setContent`, locale `es-CL`, timezone `America/Santiago`
- Emisión idempotente protegida por advisory lock, control de copia con marca de agua

### Catálogo de documentos de ENE

| Tipo | Origen | Notas |
|---|---|---|
| `cotizacion` | nuevo | **Bilingüe**, con modalidad valor total o desglosado por ítem |
| `orden-compra` | adaptar de FAS | La plantilla de FAS es casi la misma |
| `comprobante-pago` | nuevo | Simple |

### Bilingüe — lo único genuinamente nuevo del motor

El registry de FAS no contempla idioma. Extender:

1. `RegistryEntry` recibe `idioma: 'es' | 'en'` en el resolver y en el render.
2. Los textos fijos de plantilla salen de un diccionario por tipo de documento: `templates/<tipo>/i18n.ts`.
3. Los textos de dominio vienen del dato: `Servicio.nombre`/`nombreEn`, `descripcion`/`descripcionEn`, `Zona.nombre`/`nombreEn`.
4. `nombreArchivo` incorpora el idioma.

**Resolver esto al diseñar la plantilla de cotización, no después.** Es la decisión que más cuesta revertir.

---

## 9. Reportería

Dos piezas, ambas en la etapa 10.

### Dashboard (Radar)

Tablero de OT próximas dentro de la aplicación. **Ventanas de aviso fijas** por tipo de servicio en fase 1 —configurables por usuario y avisos programados son fase 2—. Muestra: OT que entran en ventana de preparación, OT sin OC con fecha próxima, semáforo por estado.

Ventanas por defecto (constantes, no configurables en fase 1):

```
ALOJAMIENTO  60 días    GUIA          21 días
TRANSPORTE   30 días    ENTRADAS      15 días
ALIMENTACION 15 días    OTRO          30 días
```

### Conexión Excel

Vistas SQL de solo lectura con prefijo `rpt_`, documentadas y estables:

```
rpt_operaciones               OT con venta, costo teórico, costo real, utilidad, todo en CLP
rpt_lineas_costo              línea a línea, teórico vs real, por servicio y proveedor
rpt_cuenta_corriente_cliente  movimientos con saldo acumulado
rpt_pagos_proveedor           facturas y pagos por proveedor y OC
rpt_cartera_futura            OT en espera por mes de operación
```

> **Decisión pendiente y bloqueante para infraestructura:** cómo llega Excel a esas vistas. Opción A, ODBC con `psqlODBC` instalado por máquina y la base alcanzable —fricción alta, superficie de seguridad—. Opción B, exponer las vistas como endpoints REST de solo lectura y consumirlas con Power Query, que es nativo de Excel y no instala nada. **Recomendación: opción B.** Definir antes de la etapa 1 porque condiciona dónde vive el servidor.

---

## 10. Reutilización desde FAS

Path de referencia: `~/sites/FAS`. Lo siguiente se copia y adapta, no se reescribe.

| Origen en FAS | Uso en ENE | Adaptación |
|---|---|---|
| `docker-compose.yml`, `Makefile`, `setup-check.sh` | Infraestructura | Directo, Redis incluido (§3) |
| `docker-compose.demo.yml`, `.env.demo.example` | Deploy en Coolify | Adaptado como `docker-compose.qa.yml`/`.env.qa.example`, sin `pgadmin` |
| `*/Dockerfile` (producción, no `Dockerfile.dev`) | Build de imágenes | Directo |
| `src/plugins/*` | auth-guard, error-handler, swagger | Directo |
| `src/lib/{prisma,auth,crypto,mailer}.ts` | Instancias compartidas | Directo |
| `src/shared/{pagination,errors,types}.ts` | Utilidades | Directo |
| `src/shared/rut-validator.ts` | Validación de RUT | Directo |
| `src/shared/advisory-locks.ts` | Correlativos | Namespaces nuevos (§7) |
| `src/modules/documentos/**` | Motor de documentos | Agregar idioma (§8) |
| `src/shared/pdf/**` | Render Playwright | Directo |
| `src/modules/documentos/templates/orden-compra/` | Plantilla OC | Adaptar campos |
| `src/modules/config/{perfiles,usuarios,prefijos-codigo}` | Permisos y correlativos | Directo |
| `src/modules/finanzas/facturacion/dte.adapter.ts` | Facturación electrónica | Directo, cambiar RUT emisor |
| `prisma/seed-geografia-chile.ts` | Base para zonas | Adaptar a zonas turísticas |
| `fas-web` (estructura, tablas, formularios) | Frontend | Rebrandear |

**Qué NO se porta:** multi-tenancy (`lib/prisma-tenancy.ts`, `lib/empresa-context.ts`) — ENE es una sola empresa. El discriminador `areaNegocio` es un campo, no un tenant. Tampoco `@clerk/nextjs` ni el código de colas de BullMQ (Redis sí se porta, ver §3).

**Qué no existe en FAS y hay que construir entero:** itinerario día con bloques AM y PM, tarifas por tramo de pasajeros y por acomodación, margen por línea, conversión de cotización en OT, multi-moneda con dos tipos de cambio, dashboard radar.

---

## 11. Variables de entorno

### ene-api (.env)

```bash
# App
NODE_ENV=development
PORT=3001
TZ=America/Santiago

# Database
DATABASE_URL=postgresql://ene:ene@localhost:5432/ene

# Auth (Better Auth)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3001

# Email (Resend)
RESEND_API_KEY=
MAIL_FROM="Extremo Norte <no-reply@extremonorte.com>"

# DTE — facturación electrónica
DTE_PROVIDER=mock            # mock | chilesystems | simplefactura
DTE_API_URL=
DTE_API_KEY=
DTE_RUT_EMISOR=
DTE_AMBIENTE=certificacion   # certificacion | produccion

# Motor de documentos (Playwright)
PDF_BROWSER_WS=              # vacío en desarrollo, usa Chromium local

# Adjuntos
ADJUNTOS_PATH=/data/adjuntos
ADJUNTOS_MAX_MB=25

# Moneda
TC_REFERENCIA_USD=950        # TC de referencia para OT abiertas

# CORS
CORS_ORIGIN=http://localhost:3000
```

### ene-web (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
BETTER_AUTH_URL=http://localhost:3001
```

---

## 12. Etapas de la fase 1

26 de agosto al 16 de octubre de 2026 · 36 días hábiles · etapas consecutivas.

| # | Etapa | Fechas | Días | Entregable |
|---|---|---|---|---|
| 1 | Arranque, ambientes y modelo de datos | 26–27 ago | 2 | Repo, docker-compose, schema Prisma completo migrado |
| 2 | Versionado · mecanismo transversal | 28 ago – 2 sep | 4 | `shared/versionado/` operativo para Cotización, OT y OC |
| 3 | Autenticación, usuarios y perfiles | 3 sep | 1 | Login, CRUD de usuarios, perfiles con niveles |
| 4 | Maestros generales | 4 – 8 sep | 3 | Clientes, ejecutivos, grupos, proveedores, servicios, zonas |
| 5 | Maestros de tarifas | 9 sep | 1 | Tarifarios con los tres modelos y vigencia |
| 6 | Motor de costeo | 10 – 15 sep | 4 | Cálculo por línea, márgenes, conversión de moneda |
| 7 | Cotización con sus estados | 16 – 22 sep | 3 | Itinerario, versiones, PDF bilingüe |
| 8 | Orden de Trabajo | 23 – 28 sep | 4 | Conversión desde cotización, línea base, adjuntos |
| 9 | Generación de órdenes de compra | 29 sep – 1 oct | 3 | Emisión, validación de correspondencia, costo real, PDF |
| 10 | Facturación | 2 – 8 oct | 5 | DTE, cuenta corriente, pagos a proveedores |
| 11 | Reportería · Dashboard y Excel | 9 – 12 oct | 2 | Radar con ventanas fijas, vistas `rpt_` |
| 12 | Pruebas integrales y puesta en marcha | 13 – 16 oct | 4 | Sistema en producción |

**Demostraciones con usuarios:** 9 de septiembre (maestros), 22 de septiembre (costeo y cotización), 1 de octubre (OT y OC).

**El plan no tiene holgura.** Las etapas son consecutivas: un atraso corre toda la cadena.

---

## 13. Reglas para Claude Code

1. **No introducir dependencias nuevas** sin justificarlo contra el plazo. El stack de §3 es cerrado para la fase 1.
2. **Cada etapa se ejecuta según `Docs/plan-implementacion.md`**: ahí están los endpoints, los tests obligatorios y el criterio de término. No avanzar a la siguiente sin cerrar el checklist.
3. **Las reglas de dominio se leen en `Docs/reglas-negocio.md` antes de implementar.** Cada regla tiene identificador: citarlo en el código y en los tests.
4. **Antes de escribir un módulo, revisar si existe en FAS** (`~/sites/FAS`) y portarlo. La velocidad del plan depende de eso.
5. **Todo monto pasa por `shared/dinero/`.** Si aparece un `parseFloat` o una multiplicación directa sobre un monto, está mal.
6. **Todo correlativo se genera dentro de transacción con advisory lock.** No hay excepciones.
7. **Naming en español** para dominio, inglés para infraestructura y librerías.
8. Cada módulo respeta la estructura de §4: controller thin, lógica en service, Prisma solo en repository.
9. Validación con Zod en el borde; los tipos del dominio se derivan de los schemas.
10. Las migraciones son incrementales y con nombre descriptivo. No editar migraciones ya aplicadas.
11. Tests con Vitest sobre el motor de costeo y los correlativos como mínimo. Es donde un error cuesta plata.
12. Al cerrar cada etapa, actualizar este documento con lo que se decidió.

---## 14. Decisiones pendientes

| # | Tema | Bloquea | Fecha límite |
|---|---|---|---|
| 1 | Método de conexión de Excel: ODBC o REST + Power Query | Infraestructura y etapa 11 | Etapa 1 |
| 2 | Proveedor de facturación electrónica y credenciales de certificación | Etapa 10 | 1 de octubre |
| 3 | Confirmar el suplemento single como valor propio en el tarifario | Etapa 5 | 2 de septiembre |
| 4 | ¿Existe el modelo `UNITARIO_PAX` o todo se resuelve con tramo y acomodación? | Etapa 5 | 2 de septiembre |
| 5 | ¿Se cotizan varias bases de pasajeros en paralelo (2/4/6)? | Etapa 6 | 9 de septiembre |
| 6 | Formato oficial de cotización y su versión en inglés | Etapa 7 | 14 de septiembre |
| 7 | Formato oficial de orden de compra | Etapa 9 | 24 de septiembre |
| 8 | Migración: qué maestros se traspasan y cuáles se cargan a mano | Etapa 4 | 3 de septiembre |
| 9 | Alcance de NORA — sistema existente, hoy en standby | Fase 2 | — |

---

## 15. Fuera de alcance de la fase 1

Construido sobre el mismo modelo de datos, sin rehacer trabajo:

Ventanas de aviso configurables por usuario y avisos programados · control de releases, vencimientos y reconfirmación con agencias · ficha operativa y preparación del servicio · incidencias y captura de gastos en terreno · cierre operativo y económico con descomposición de efecto costo y efecto tipo de cambio · comunicaciones por correo y bitácora de la OT · portal de proveedores · panel de gestión para la dirección · reporte de documentos por vencer y nómina de pago semanal.

**Fuera del sistema por completo:** contabilidad y tributario, remuneraciones y personal, conciliación bancaria, inteligencia artificial, integraciones con banco, Previred, Google Drive, GDS y motores de reserva.
