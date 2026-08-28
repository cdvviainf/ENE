# Plan de implementación — Fase 1

> Documento de trabajo para Claude Code. Define **qué construir, en qué orden y
> cuándo una etapa está terminada**.
>
> Jerarquía documental:
> - `CLAUDE.md` — contrato técnico: stack, estructura, modelo de datos, convenciones
> - `Docs/reglas-negocio.md` — **autoritativo** sobre reglas de dominio (`RN-XX-NN`)
> - **este documento** — orden de construcción y criterios de término
>
> Proyecto aprobado. 12 etapas consecutivas, 36 días hábiles, 26 de agosto al
> 16 de octubre de 2026.

---

## 0. Cómo trabajar

### Ciclo por etapa

1. **Leer** la etapa acá y las reglas `RN-` que referencia en `Docs/reglas-negocio.md`.
2. **Revisar si existe en FAS** (`~/sites/FAS`) antes de escribir nada. La velocidad del plan depende de portar, no de inventar.
3. **Construir** siguiendo la estructura de módulo de `CLAUDE.md` §4.
4. **Escribir los tests obligatorios** de la etapa. No son opcionales.
5. **Verificar el criterio de término** completo antes de avanzar.
6. **Actualizar `CLAUDE.md`** con lo que se decidió durante la etapa.

### Reglas que no se negocian

- Todo monto pasa por `shared/dinero/`. Si aparece `parseFloat`, `Number()` o aritmética directa sobre un monto, está mal (`RN-DIN-01`).
- Todo correlativo se genera con advisory lock dentro de transacción (`RN-COR-01`).
- Toda versión se crea con `shared/versionado/`. No se reimplementa por módulo (`RN-VER-01`).
- Controller thin, lógica en service, Prisma solo en repository.
- Citar el identificador de regla en el código cuando se implementa una: `// RN-COS-01`.

---

## 1. Contratos transversales de API

Aplican a todos los módulos. Definir una vez en la etapa 3 y reutilizar.

### Formato de respuesta

```jsonc
// Listado
{ "data": [...], "meta": { "total": 120, "page": 1, "limit": 20, "totalPages": 6 } }

// Recurso único
{ "data": { ... } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### Códigos de error canónicos

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod falla o una regla de negocio rechaza el dato |
| `NOT_FOUND` | 404 | El recurso no existe o está soft-deleted |
| `CONFLICT` | 409 | Estado inválido para la operación (versión histórica, OT aprobada) |
| `FORBIDDEN` | 403 | El perfil no tiene nivel suficiente |
| `INTERNAL_ERROR` | 500 | No controlado |

### Serialización

- **Montos:** string decimal con 4 decimales. `"4500000.0000"`. Nunca número.
- **Fechas:** ISO 8601 UTC. `"2026-10-14T00:00:00.000Z"`.
- **Enums:** el valor de Prisma tal cual. `"EN_ESPERA"`.
- **Moneda:** siempre acompaña al monto. `{ "monto": "4500.0000", "moneda": "USD" }`.

### Query params de listado

```
?page=1&limit=20&q=texto&estado=EN_ESPERA&desde=2026-01-01&hasta=2026-12-31
```

### Autorización

Todo endpoint declara su ítem de menú y nivel mínimo:

```ts
app.get('/api/cotizaciones', {
  preHandler: exigirNivel('COTIZACIONES', 'LECTURA'),
  schema: { tags: ['cotizaciones'], ... },
}, handler)
```

---

## 2. Etapa 1 · Arranque, ambientes y modelo de datos

**26 – 27 de agosto · 2 días**

### Objetivo
Dejar el entorno levantando y el esquema migrado. El scaffold ya está creado.

### Qué se hace
1. `cp ene-api/.env.example ene-api/.env` y completar `BETTER_AUTH_SECRET`.
2. `make up` — postgres, pgAdmin y API.
3. `cd ene-api && npm install`.
4. `npx prisma migrate dev --name inicial` — primera migración desde `schema.prisma`.
5. `npm run db:seed` — perfiles, ítems de menú, zonas, tipos de servicio, prefijos.
6. `npm run db:bootstrap -- --email cdv@viain.cl --nombre "Christian Droguett"`.
7. `git init`, `.gitignore` ya está, primer commit.
8. CI mínimo en `.github/workflows/ci.yml`: instalar, `tsc --noEmit`, `vitest run`.

### Verificaciones
- `npx prisma validate` sin errores.
- Las 6 relaciones nombradas del schema generan sin warnings.
- `GET /api/health` devuelve `{ estado: "ok", base: "ok" }`.
- `GET /docs` muestra Swagger.

### Criterio de término
`make up && make migrate && make seed` desde cero deja la API respondiendo y la
base poblada con los maestros semilla. El repo tiene su primer commit y CI verde.

---

## 3. Etapa 2 · Versionado · mecanismo transversal

**28 de agosto – 2 de septiembre · 4 días** · Reglas `RN-VER-01` a `RN-VER-13`

### Objetivo
Un solo mecanismo de versionado que Cotización, OT y OC consumen. Se construye
una vez acá; las etapas 7, 8 y 9 no lo reimplementan.

### Prerrequisito
Etapa 1 cerrada. `shared/versionado/index.ts` ya tiene el contrato escrito.

### Qué se construye

```
src/shared/versionado/
├── index.ts              # ya existe: Versionable, crearSiguienteVersion, exigirVersionEditable
├── cotizacion.ts         # implementación de Versionable para Cotizacion
├── orden-trabajo.ts      # implementación para OrdenTrabajo
└── orden-compra.ts       # implementación para OrdenCompra
```

Cada implementación provee: `lockNamespace` (de `shared/advisory-locks.ts`),
`cargarCabecera`, `ultimaVersion`, `crearVersion`, `copiarLineas`, `fijarVigente`.

### Decisiones a tomar acá
- **Copia de líneas:** `copiarLineas` debe copiar todos los campos de negocio y **no** copiar ids ni timestamps. Definir el helper una vez.
- **Consulta histórica:** endpoint genérico `GET /api/<entidad>/:id/versiones` y `GET /api/<entidad>/:id/versiones/:version`, que devuelve el documento tal como estaba (`RN-VER-09`).

### Tests obligatorios
| Test | Regla | Verifica |
|---|---|---|
| Dos `crearSiguienteVersion` concurrentes sobre la misma cabecera | `RN-VER-04`, `RN-VER-07` | Versiones 2 y 3, ninguna duplicada, sin saltos |
| Escritura sobre versión histórica | `RN-VER-02`, `RN-VER-08` | Rechaza con `CONFLICT` |
| Versión 2 sin motivo | `RN-VER-06` | Rechaza con `VALIDATION_ERROR` |
| `versionVigenteId` tras crear v3 | `RN-VER-05` | Apunta a v3, v1 y v2 siguen existiendo |
| Copia de líneas de v2 a v3 | `RN-VER-01` | Mismos valores, ids nuevos |

> El test de concurrencia es el importante. Lanzar dos transacciones reales en
> paralelo contra la base, no simular.

### Criterio de término
Las tres entidades versionan con el mismo código. Los cinco tests pasan. Ninguna
etapa posterior necesita escribir lógica de versionado.

---

## 4. Etapa 3 · Autenticación, usuarios y perfiles

**3 de septiembre · 1 día** · Reglas `RN-PER-01` a `RN-PER-03`

### Qué se construye

```
src/lib/auth.ts                    # Better Auth contra Prisma
src/plugins/auth-guard.ts          # exigirNivel(itemMenu, nivel)
src/modules/auth/                  # rutas de sesión
src/modules/users/                 # CRUD de usuarios
src/modules/config/perfiles/       # perfiles y su matriz de permisos
```

### Endpoints

```
POST   /api/auth/sign-in
POST   /api/auth/sign-out
GET    /api/auth/session           → usuario, perfil y matriz de ítems con nivel

GET    /api/users                  LECTURA en USUARIOS
POST   /api/users                  TOTAL
PATCH  /api/users/:id              TOTAL
DELETE /api/users/:id              TOTAL  (soft delete)

GET    /api/config/perfiles        LECTURA en USUARIOS
PUT    /api/config/perfiles/:id/permisos   TOTAL
```

### Portar de FAS
`src/modules/config/{perfiles,usuarios}` y el `auth-guard.ts`. Es transferencia
casi directa: mismo modelo de perfil, ítem de menú y nivel.

### Criterio de término
Un usuario con perfil `OPERACIONES` recibe 403 al pedir `/api/config/perfiles`.
`GET /api/auth/session` devuelve la matriz completa que el frontend usará para
armar el menú.

---

## 5. Etapa 4 · Maestros generales

**4 – 8 de septiembre · 3 días**

> **Spec detallada en `Docs/mantenedores.md`**: campos, validaciones, columnas de
> listado, campos buscables y el patrón de creación al vuelo. Leerla completa
> antes de escribir el primer módulo — son 4 días para seis maestros y no hay
> margen para rehacer el modelo.

### Qué se construye

```
src/modules/clientes/       # Cliente + ClienteEjecutivo
src/modules/grupos/         # Grupo + Pasajero
src/modules/proveedores/    # Proveedor + Alias + Cuenta + Contacto
src/modules/servicios/      # Servicio + TipoServicio
src/modules/config/zonas/
```

### Endpoints (patrón repetido)

```
GET    /api/clientes?q=&tipo=AGENCIA
POST   /api/clientes
GET    /api/clientes/:id                    → incluye ejecutivos
PATCH  /api/clientes/:id
DELETE /api/clientes/:id
POST   /api/clientes/:id/ejecutivos
PATCH  /api/clientes/:id/ejecutivos/:eid

GET    /api/grupos?q=apellido               → búsqueda por apellido (RN-OT-03)
GET    /api/proveedores?q=&tipoServicioId=  → q busca en razón social Y alias
GET    /api/servicios?zonaId=&tipoServicioId=
GET    /api/config/zonas
```

### Detalles que importan
- **Creación al vuelo obligatoria** (`Docs/mantenedores.md` §8): todo campo que referencia otro maestro lleva un botón `+` que lo crea sin salir del formulario, dejándolo seleccionado al volver. Portar `features/mantenedor-simple/{queries,mutations}.ts` y el patrón `*-quick-create.tsx` de FAS **antes** de escribir el primer mantenedor: es lo que hace barato tener trece.
- **Búsqueda de proveedor por alias** (`ProveedorAlias`): el parámetro `q` debe encontrar tanto por razón social como por nombre comercial y alias. Es el dolor declarado de administración.
- **Código automático**: `codigo` se genera desde `PrefijoCodigo` con advisory lock (`RN-COR-01`).
- **Servicios bilingües**: `nombre`/`nombreEn` y `descripcion`/`descripcionEn` son campos de primera clase, no un extra.

### Tests obligatorios
- Búsqueda de proveedor por alias devuelve el proveedor.
- Dos altas concurrentes generan códigos distintos sin saltos.
- Soft delete deja el registro fuera de los listados pero accesible por id.

### Criterio de término
Los cinco maestros con CRUD completo y permisos aplicados. **Extremo Norte puede
empezar a cargar datos reales el 4 de septiembre.**

---

## 6. Etapa 5 · Maestros de tarifas

**9 de septiembre · 1 día** · Reglas `RN-TAR-01` a `RN-TAR-06` · Spec en `Docs/mantenedores.md` §7

### Qué se construye

```
src/modules/tarifas/     # Tarifario + TarifarioValor
```

### Endpoints

```
GET    /api/tarifas?proveedorId=&servicioId=&vigenteA=2026-10-14
POST   /api/tarifas                  # cabecera + valores en una transacción
GET    /api/tarifas/:id
POST   /api/tarifas/:id/nueva-version   # RN-TAR-06: no reemplaza, versiona
```

### Validaciones [BLOQUEA]
- Tramos sin solape ni huecos dentro del rango cubierto (`RN-TAR-02`).
- El último tramo puede tener `paxHasta` nulo.
- En `ACOMODACION`, si el suplemento single no cuadra con la diferencia entre dos habitaciones y una, **[ADVIERTE]** pero guarda (`RN-TAR-04`).

### Tests obligatorios
| Test | Regla | Esperado |
|---|---|---|
| Tarifario con tramos 1–2 y 2–5 | `RN-TAR-02` | Rechaza por solape |
| Tarifario con tramos 1–2 y 4–6 | `RN-TAR-02` | Rechaza por hueco |
| Acomodación 1 pax 100.000, 2 pax 140.000, supl. 60.000 | `RN-TAR-04` | Acepta sin advertencia |
| Nueva versión de tarifario | `RN-TAR-06` | El anterior queda `activo=false`, las líneas ya valorizadas no cambian |

### Criterio de término
Los tres modelos de tarifa se cargan y consultan. La demo del 9 de septiembre
muestra tarifarios reales de Extremo Norte cargados.

---

## 7. Etapa 6 · Motor de costeo

**10 – 15 de septiembre · 4 días** · Reglas `RN-COS-01` a `RN-COS-07`, `RN-DIN-*`

> **Es el corazón del sistema y el mayor riesgo económico declarado por el
> equipo.** Acá un error cuesta plata directamente.

### Qué se construye

```
src/modules/costeo/
├── costeo.service.ts        # valorización pura, sin acceso a datos
├── costeo.repository.ts     # resuelve tarifario vigente
└── costeo.types.ts
```

### Funciones centrales

```ts
/// Resuelve el costo de una línea según el modelo de tarifa. No toca la base:
/// recibe el TarifarioValor ya cargado.
resolverCosto(valor: TarifarioValor, pax: number, acomodacion?: Acomodacion): Decimal

/// Aplica margen por línea y totaliza. RN-COS-01, RN-COS-04.
valorizar(lineas: LineaCosteo[]): { costoTotal, margenTotal, ventaTotal }

/// Recalcula todas las líneas ante un cambio de pasajeros. RN-COS-07.
recalcularPorPax(lineas: LineaCosteo[], nuevoPax: number): LineaCosteo[]
```

### Tests obligatorios — los números son exactos

| # | Caso | Esperado |
|---|---|---|
| 1 | Costo 3.000.000, margen 0,50 | Venta **4.500.000** |
| 2 | Las seis líneas de `RN-COS-04` | Costo 3.000.000, venta 4.500.000, margen derivado 0,50 |
| 3 | Traslado por tramo, de 2 a 3 pax | Costo sube de 95.000 a **130.000** |
| 4 | 2 pax en habitaciones separadas | 200.000 = 140.000 + 60.000 |
| 5 | Línea `OTRO` | No consulta tarifario, usa el valor digitado |
| 6 | Conversión CLP → USD a TC 1.000 | 4.500.000 → **USD 4.500** |

> Si el test 1 da 6.000.000, se aplicó margen sobre venta en vez de markup. Es
> el error más caro posible y el más fácil de cometer.

### Criterio de término
Los seis tests pasan con los números exactos. `costeo.service.ts` no importa
Prisma: es lógica pura y por eso es testeable sin base.

---

## 8. Etapa 7 · Cotización con sus estados

**16 – 22 de septiembre · 3 días** · Reglas `RN-COT-01` a `RN-COT-07`

### Qué se construye

```
src/modules/cotizaciones/
src/modules/documentos/          # portar de FAS + agregar idioma
src/modules/documentos/templates/cotizacion/v1/
```

### Endpoints

```
GET    /api/cotizaciones?estado=&clienteId=&q=
POST   /api/cotizaciones                          → crea BORRADOR + versión 1
GET    /api/cotizaciones/:id                      → con versión vigente y líneas
POST   /api/cotizaciones/:id/versiones            → usa shared/versionado
GET    /api/cotizaciones/:id/versiones            → historial
GET    /api/cotizaciones/:id/versiones/:version   → RN-VER-09
PATCH  /api/cotizaciones/:id/estado               → transiciones válidas
POST   /api/cotizaciones/:id/aprobar              → genera OT (etapa 8)

GET    /api/documentos/preview?tipo=cotizacion&id=&idioma=es   → HTML
POST   /api/documentos/emitir                                   → PDF
```

### Motor de documentos — lo nuevo es el idioma
1. `RegistryEntry` recibe `idioma: 'es' | 'en'` en resolver y render.
2. Textos fijos en `templates/cotizacion/i18n.ts`.
3. Textos de dominio desde el dato: `Servicio.nombreEn`, `descripcionEn`, `Zona.nombreEn`.
4. `nombreArchivo` incorpora el idioma: `COT-2026-0142_EN.pdf`.
5. Modalidad **valor total** o **desglosado por ítem** como parámetro del resolver (`RN-COT-06`).

> Resolver el bilingüe al diseñar esta plantilla, no después. Es la decisión que
> más cuesta revertir.

### Tests obligatorios
- Transición inválida de estado rechaza con `CONFLICT`.
- Aprobar sin líneas rechaza (`RN-COT-04`).
- El PDF en inglés usa `nombreEn` de servicios y zonas.
- La modalidad desglosada no expone costo ni margen (`RN-COT-07`).

### Criterio de término
Se cotiza de punta a punta y sale el PDF en ambos idiomas y ambas modalidades.
**Demo del 22 de septiembre.**

---

## 9. Etapa 8 · Orden de Trabajo

**23 – 28 de septiembre · 4 días** · Reglas `RN-OT-01` a `RN-OT-08`

### Qué se construye

```
src/modules/ordenes-trabajo/
src/modules/adjuntos/
src/lib/storage.ts               # filesystem bajo ADJUNTOS_PATH
```

### La conversión — transacción única

`POST /api/cotizaciones/:id/aprobar` hace todo esto o nada:

1. Valida que la cotización tenga cliente, ejecutivo, grupo, fecha, pax y al menos una línea (`RN-COT-04`).
2. Toma advisory lock del correlativo de OT (`LOCK_ORDEN_TRABAJO_CORRELATIVO`).
3. Genera `numero` = `OT-{YYYY}-{NNNN}`.
4. Crea la OT copiando cabecera y **congelando** costo teórico, margen, venta, moneda y TC (`RN-OT-02`).
5. Crea la versión 1 con las líneas copiadas — **la línea base** (`RN-VER-12`).
6. Marca la cotización `APROBADA` y le fija `ordenTrabajoId`.

### Endpoints

```
GET    /api/ordenes-trabajo?estado=&desde=&hasta=&q=apellido
GET    /api/ordenes-trabajo/:id
POST   /api/ordenes-trabajo/:id/versiones     { tipoCambio, motivo, lineas }
PATCH  /api/ordenes-trabajo/:id/estado
PATCH  /api/ordenes-trabajo/:id/lineas/:lid/estado-servicio

POST   /api/adjuntos                          multipart, { entidad, entidadId }
GET    /api/adjuntos/:id/descargar            verifica permiso sobre la entidad dueña
DELETE /api/adjuntos/:id
```

### Validaciones [BLOQUEA]
- Una OT solo nace de cotización aprobada (`RN-OT-01`).
- `apellido` obligatorio y buscable (`RN-OT-03`).
- Una OT `CANCELADA` no pasa a cierre salvo `NO_SHOW` (`RN-OT-06`).
- El path de almacenamiento nunca se expone (`RN-ADJ-02`).

### Tests obligatorios
- Aprobar cotización genera OT con versión 1 y correlativo correcto.
- Aprobar dos veces la misma cotización rechaza.
- Cerrar OT cancelada rechaza; con `NO_SHOW` acepta.
- Descargar adjunto sin permiso sobre la OT devuelve 403.

### Criterio de término
Cotización aprobada se convierte en OT con línea base congelada. Los adjuntos
suben y bajan con permiso verificado.

---

## 10. Etapa 9 · Generación de órdenes de compra

**29 de septiembre – 1 de octubre · 3 días** · Reglas `RN-OC-01` a `RN-OC-05`

### Endpoints

```
GET    /api/ordenes-compra?ordenTrabajoId=&proveedorId=&estado=
POST   /api/ordenes-compra                     { ordenTrabajoId, proveedorId, lineas }
POST   /api/ordenes-compra/:id/emitir          valida correspondencia [BLOQUEA]
POST   /api/ordenes-compra/:id/versiones
PATCH  /api/ordenes-compra/:id/anular
GET    /api/documentos/preview?tipo=orden-compra&id=
```

### La validación de correspondencia — `RN-OC-02`

Antes de emitir, comparar cada línea de OC contra su `OrdenTrabajoLinea` en la
versión vigente de la OT:

| Campo | Tolerancia |
|---|---|
| Servicio | Exacto |
| Fecha de servicio | Exacto |
| Cantidad de pasajeros | Exacto |
| Tarifa | Exacto contra el costo teórico de la línea |

Cualquier diferencia **bloquea la emisión** con `CONFLICT` y detalle de qué no
cuadra. No advierte: bloquea.

### Portar de FAS
`templates/orden-compra/v1/` — la plantilla de FAS es casi la misma. Adaptar
campos y agregar el idioma si aplica.

### Tests obligatorios
- OC con pax distinto al de la OT bloquea la emisión.
- OC emitida registra `ordenTrabajoVersionId` (`RN-VER-13`).
- El costo real de la OC alimenta la comparación contra la versión 1.

### Criterio de término
Se emiten OC desde una OT con validación de correspondencia y PDF.
**Demo del 1 de octubre.**

---

## 11. Etapa 10 · Facturación

**2 – 8 de octubre · 5 días** · Reglas `RN-FAC-01` a `RN-FAC-06`, `RN-MON-*`

### Qué se construye

```
src/modules/facturacion/
├── dte.adapter.ts           # portar de FAS
├── proveedores/mock.ts
└── proveedores/chilesystems.ts
src/modules/cobros/          # cuenta corriente y pagos a proveedores
```

### Endpoints

```
POST   /api/facturacion/:otId/emitir      { tipo: FACTURA_AFECTA }
GET    /api/facturacion/:id

POST   /api/cobros/abonos                 { clienteId, ordenTrabajoId, monto, moneda, tipoCambio }
POST   /api/cobros/pagos                  pago del cliente contra factura
GET    /api/cobros/cuenta-corriente/:clienteId
POST   /api/cobros/facturas-proveedor     multipart con el adjunto
POST   /api/cobros/pagos-proveedor
```

### Lo que importa
- **Abono sin factura** (`RN-FAC-03`): es lo habitual en receptivo, el anticipo llega meses antes. No puede exigir factura previa.
- **Aplicación contra abonos** (`RN-FAC-04`): al emitir factura se descuentan los abonos disponibles del cliente.
- **Saldo calculado, no almacenado** (`RN-FAC-05`).
- **Dos tipos de cambio** (`RN-MON-02`): el de cotización queda en la OT, el del cobro en cada movimiento. Ninguno se recalcula.
- **Factura de proveedor** (`RN-FAC-06`): se adjunta y se muestran los valores lado a lado. La validación es humana.

### Tests obligatorios
- Abono contra OT sin factura se registra y queda disponible.
- Emitir factura aplica los abonos y deja el saldo correcto.
- El movimiento guarda `montoClp` calculado con su propio TC, no con el de referencia.

### Criterio de término
Se emite factura vía adaptador mock, la cuenta corriente cuadra y los pagos a
proveedores quedan registrados contra su OC.

---

## 12. Etapa 11 · Reportería · Dashboard y Excel

**9 – 12 de octubre · 2 días**

### Dashboard (Radar)

```
GET /api/dashboard/radar?ventana=30
```

Devuelve las OT que entran en ventana de preparación, con semáforo por estado.
**Ventanas fijas** en fase 1, tomadas de `TipoServicio.ventanaAvisoDias`:

```
ALOJAMIENTO 60 · TRANSPORTE 30 · GUIA 21 · ENTRADAS 15 · ALIMENTACION 15 · OTRO 30
```

Las ventanas configurables por usuario y los avisos programados son fase 2.

### Vistas SQL de solo lectura

Crear como migración Prisma con SQL crudo. Prefijo `rpt_`, documentadas y
estables — son contrato con Excel:

| Vista | Contenido |
|---|---|
| `rpt_operaciones` | OT con venta, costo teórico, costo real y utilidad, **en CLP** |
| `rpt_lineas_costo` | Línea a línea, teórico vs real, por servicio y proveedor |
| `rpt_cuenta_corriente_cliente` | Movimientos con saldo acumulado por `ROW_NUMBER` |
| `rpt_pagos_proveedor` | Facturas y pagos por proveedor y OC |
| `rpt_cartera_futura` | OT en espera por mes de operación |

Todas convierten a pesos con el TC del movimiento cuando existe, y con
`TC_REFERENCIA_USD` mientras la OT está abierta (`RN-MON-03`).

> **Decisión pendiente que bloquea:** ODBC o endpoints REST con Power Query. Ver
> `CLAUDE.md` §14 punto 1. Debe estar resuelta antes de esta etapa.

### Criterio de término
El radar lista las OT próximas correctamente y las cinco vistas devuelven datos
consistentes con lo que muestra la aplicación.

---

## 13. Etapa 12 · Pruebas integrales y puesta en marcha

**13 – 16 de octubre · 4 días**

### Recorrido completo con datos reales

1. Cotización nueva en USD para una agencia → versión 2 por cambio del cliente → aprobación.
2. OT generada con línea base congelada → adjuntar respaldos.
3. Emisión de dos OC a proveedores distintos → registro de costo real.
4. Factura al cliente → abono previo aplicado → saldo cuadrado.
5. Verificar en `rpt_operaciones` que utilidad y desviación calzan con lo esperado.

### Además
- Corrección de las observaciones acumuladas de las pruebas de cliente.
- Capacitación de los cinco usuarios.
- Migración de los maestros definitivos.
- Despliegue en el VPS y variables de producción.

### Criterio de término
El equipo de Extremo Norte opera el sistema con datos reales. El ciclo completo
—cotización, OT, OC, factura, reporte— funciona de punta a punta.

---

## 14. Checklist de cierre de etapa

Antes de avanzar a la siguiente, verificar todo:

- [ ] Los tests obligatorios de la etapa pasan.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `vitest run` verde completo, no solo los tests nuevos.
- [ ] Ningún monto pasó por `number` — revisar los diffs buscando `parseFloat`, `Number(`, `+`, `*` sobre montos.
- [ ] Los endpoints nuevos están en Swagger con su tag y descripción.
- [ ] Los endpoints nuevos declaran su ítem de menú y nivel.
- [ ] Las reglas implementadas están citadas en el código con su `RN-`.
- [ ] Migración con nombre descriptivo, no editada después de aplicada.
- [ ] `CLAUDE.md` actualizado con lo que se decidió.
- [ ] Commit con mensaje que referencia la etapa.

---

## 15. Resumen de reutilización desde FAS por etapa

| Etapa | Qué portar desde `~/sites/FAS` |
|---|---|
| 1 | `docker-compose`, `Makefile`, plugins, `lib`, `shared` — **ya está en el scaffold** |
| 2 | Patrón de advisory locks de `shared/advisory-locks.ts` |
| 3 | `src/modules/config/{perfiles,usuarios}`, `plugins/auth-guard.ts` |
| 4 | Estructura de módulo y patrón de CRUD; `shared/rut-validator.ts`; `features/mantenedor-simple/*` y los `*-quick-create.tsx` del frontend |
| 5 | Nada directo — el modelo de tarifas es propio de ENE |
| 6 | Nada directo — el motor de costeo es propio de ENE |
| 7 | `src/modules/documentos/**` completo y `shared/pdf/**`. **Agregar idioma.** |
| 8 | Patrón de adjuntos con `@fastify/multipart` |
| 9 | `templates/orden-compra/v1/` — casi el mismo documento |
| 10 | `src/modules/finanzas/facturacion/dte.adapter.ts` |
| 11 | Nada directo |
| 12 | — |

**No portar:** `lib/prisma-tenancy.ts`, `lib/empresa-context.ts` (ENE es una sola
empresa), `@clerk/nextjs`, BullMQ ni Redis.
