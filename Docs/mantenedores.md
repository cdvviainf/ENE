# Mantenedores — especificación

> Spec de las etapas 4 y 5. **Autoritativo sobre campos, validaciones y
> comportamiento de pantalla.** Complementa `Docs/reglas-negocio.md` (reglas de
> dominio) y `Docs/plan-implementacion.md` (orden y criterios de término).
>
> El objetivo de este documento es que los mantenedores se construyan una vez.
> Son 4 días para seis maestros: no hay margen para iterar sobre el modelo.

---

## 0. Convenciones comunes a todos los mantenedores

### Campos de auditoría

Presentes en todos, nunca editables desde la interfaz:

```
creadoEn        DateTime  @default(now())
creadoPor       String    -- usuario de la sesión, no un valor por defecto
actualizadoEn   DateTime? @updatedAt
actualizadoPor  String?
eliminadoEn     DateTime?
```

### Código

**RN-MAN-01** Todo maestro con identificación humana lleva `codigo String @unique`,
generado desde `PrefijoCodigo` con advisory lock (`RN-COR-01`).

**RN-MAN-02** El código se **sugiere** al abrir el formulario de alta y es
**editable**. Si el usuario lo cambia, se valida unicidad. Si lo deja como
viene, se consume el correlativo.

| Entidad | Prefijo | Dígitos | Ejemplo |
|---|---|---|---|
| Cliente | `CL` | 4 | `CL0001` |
| Proveedor | `PR` | 4 | `PR0001` |
| Grupo | `GR` | 5 | `GR00001` |
| Servicio | `SV` | 4 | `SV0001` |
| Zona | manual | — | `SPA` |
| Tipo de servicio | manual | — | `ALOJAMIENTO` |

### Eliminación

**RN-MAN-03 [BLOQUEA]** No hay borrado físico. `DELETE` hace soft delete
seteando `eliminadoEn`.

**RN-MAN-04 [BLOQUEA]** El soft delete se rechaza si el registro está
referenciado por una operación **no cerrada**: cotización en negociación, OT en
cualquier estado salvo `CERRADA`, u OC vigente. El error indica cuántas y cuáles.

```jsonc
{ "error": { "code": "CONFLICT",
  "message": "No se puede eliminar: el proveedor participa en 3 operaciones activas",
  "details": { "ordenesTrabajo": ["OT-2026-0098","OT-2026-0104"], "ordenesCompra": ["OC-2026-0031"] } } }
```

**RN-MAN-05** Un registro eliminado no aparece en listados ni en selectores,
pero sigue siendo accesible por id y visible en las operaciones históricas que
lo referencian.

### Listados

**RN-MAN-06** Todos aceptan `?page=&limit=&q=` y ordenan por `codigo` ascendente
salvo que se indique otra cosa. `q` hace búsqueda parcial e insensible a
mayúsculas y acentos sobre los campos declarados como buscables en cada sección.

### Creación al vuelo

**RN-MAN-09 [BLOQUEA]** Todo campo que referencia otro maestro lleva un botón `+`
que permite crearlo sin salir del formulario. Especificado en §8. Aplica también
a los formularios de cotización y orden de compra, no solo a los mantenedores.

### Bilingüe

**RN-MAN-07** Solo son bilingües los campos que **llegan al cliente en un
documento**: `Servicio.nombre/nombreEn`, `Servicio.descripcion/descripcionEn` y
`Zona.nombre/nombreEn`. Tipos de servicio, condiciones y notas internas van solo
en español.

**RN-MAN-08 [ADVIERTE]** Guardar un servicio sin `nombreEn` se permite, pero el
listado lo marca. Al generar un documento en inglés sin traducción, se usa el
español y se advierte en pantalla.

---

## 1. Zona

Territorio de operación. Agrupa servicios, proveedores y reportes.

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| `codigo` | String(10) | Sí | Único, mayúsculas, sin espacios |
| `nombre` | String(80) | Sí | |
| `nombreEn` | String(80) | No | |

**Listado:** código, nombre, nombre en inglés, cantidad de servicios asociados.
**Buscable por:** código, nombre.
**Semilla:** `ARI` Arica · `ANF` Antofagasta · `SPA` San Pedro de Atacama ·
`VAP` Valparaíso · `ZCE` Zona Central · Viñas · `SCL` Santiago.

> Pendiente con el cliente: si hay que abrir zonas nuevas o estas seis cubren la
> operación actual.

---

## 2. Tipo de servicio

Clasifica servicios y proveedores, y define dos defaults importantes.

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| `codigo` | String(20) | Sí | Único, mayúsculas |
| `nombre` | String(60) | Sí | |
| `modeloTarifaDefault` | enum | Sí | `TRAMO_PAX` / `ACOMODACION` / `UNITARIO_PAX` |
| `ventanaAvisoDias` | Int | Sí | 1–365. Alimenta el radar de la etapa 11 |

**Semilla:**

| Código | Nombre | Modelo por defecto | Ventana |
|---|---|---|---|
| `ALOJAMIENTO` | Alojamiento | `ACOMODACION` | 60 |
| `TRANSPORTE` | Transporte | `TRAMO_PAX` | 30 |
| `GUIA` | Guía | `TRAMO_PAX` | 21 |
| `ENTRADAS` | Entradas y visitas | `UNITARIO_PAX` | 15 |
| `ALIMENTACION` | Alimentación | `UNITARIO_PAX` | 15 |
| `OTRO` | Otro | `UNITARIO_PAX` | 30 |

---

## 3. Cliente

Agencia de viajes (receptivo) o Empresa (eventos). **No existe cliente persona
natural** (`RN-COT-01` del glosario).

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| `codigo` | String(20) | Sí | Único, sugerido `CL0001` |
| `tipo` | enum | Sí | `AGENCIA` / `EMPRESA` |
| `razonSocial` | String(150) | Sí | |
| `rut` | String(12) | **Condicional** | Ver RN-CLI-01 |
| `nombreComercial` | String(150) | No | |
| `pais` | String(60) | Sí | Default `Chile` si `tipo = EMPRESA` |
| `monedaHabitual` | enum | Sí | Default `USD` si `AGENCIA`, `CLP` si `EMPRESA` |
| `condicionesPago` | Text | No | Texto libre |
| `email` | String(120) | No | Formato válido si viene |
| `telefono` | String(40) | No | |

**RN-CLI-01 [BLOQUEA]** El RUT es **obligatorio si `tipo = EMPRESA`**, porque
hay que emitirle documento tributario. Para `AGENCIA` es opcional: la mayoría
son extranjeras y no tienen RUT chileno. Cuando viene, se valida con
`shared/rut-validator.ts`.

**RN-CLI-02 [ADVIERTE]** Cambiar el `tipo` de un cliente que ya tiene
operaciones se permite pero advierte: cambia la moneda por defecto de las
cotizaciones nuevas, no de las existentes.

**Listado:** código, tipo, razón social, país, moneda, cantidad de OT, ejecutivos.
**Filtros:** `tipo`, `pais`, `monedaHabitual`.
**Buscable por:** código, razón social, nombre comercial, RUT.
**Orden por defecto:** razón social ascendente.

### Ejecutivos — subtabla dentro de la ficha de cliente

| Campo | Tipo | Oblig. |
|---|---|---|
| `nombre` | String(120) | Sí |
| `email` | String(120) | No |
| `telefono` | String(40) | No |
| `cargo` | String(80) | No |
| `activo` | Boolean | Sí, default `true` |

**RN-CLI-03** Los ejecutivos se editan **dentro de la ficha del cliente**, no en
un mantenedor propio. Un ejecutivo inactivo no aparece en selectores de
cotización nueva, pero sigue visible en las operaciones que lo referencian.

**RN-CLI-04 [BLOQUEA]** No se puede desactivar el último ejecutivo activo de un
cliente que tiene operaciones abiertas.

---

## 4. Grupo y pasajeros

Los que viajan. **No son el cliente**: el cliente contrata, el grupo viaja.

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| `codigo` | String(20) | Sí | Único, sugerido `GR00001` |
| `apellido` | String(80) | **Sí** | Identificador operativo (`RN-OT-03`) |
| `clienteId` | Int | Sí | |
| `nacionalidad` | String(60) | No | |
| `paisOrigen` | String(60) | No | Segmenta reportes |
| `idioma` | String(30) | No | Define el idioma sugerido del documento |
| `cantidadPax` | Int | Sí | ≥ 1 |
| `observaciones` | Text | No | |

**RN-GRP-01** El grupo se puede crear **desde la cotización**, sin salir del
flujo. No obliga a ir al mantenedor primero. Es el caso normal: la agencia pide
y recién ahí se conoce el grupo.

**RN-GRP-02** El `apellido` no es único: dos grupos distintos del mismo cliente
pueden apellidarse igual. La combinación que identifica es apellido + fecha de
operación, y por eso el listado siempre muestra ambas.

**RN-GRP-03** `cantidadPax` en el grupo es referencial. La cantidad que manda
para el costeo es la de la **cotización**, que puede diferir.

**Listado:** apellido, cliente, cantidad de pasajeros, país de origen, próxima operación.
**Buscable por:** apellido, código, nombre de pasajero.
**Orden por defecto:** apellido ascendente.

### Pasajeros — subtabla, opcional

| Campo | Tipo | Oblig. |
|---|---|---|
| `nombre` | String(120) | Sí |
| `edad` | Int | No |
| `nacionalidad` | String(60) | No |
| `documento` | String(40) | No |
| `restricciones` | Text | No |

**RN-GRP-04** El detalle de pasajeros **no es obligatorio para cotizar ni para
generar la OT**. Suele llegar semanas después. Nunca debe bloquear el flujo.

---

## 5. Proveedor

El maestro más sensible: de acá dependen la búsqueda al recibir una factura y el
pago.

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| `codigo` | String(20) | Sí | Único, sugerido `PR0001` |
| `razonSocial` | String(150) | Sí | Como aparece en la factura |
| `rut` | String(12) | Sí | Validado con `rut-validator` |
| `nombreComercial` | String(150) | No | Como lo conoce el equipo |
| `tipoServicioId` | Int | Sí | |
| `zonas` | Int[] (N:N vía `ProveedorZona`) | No | Un proveedor puede operar en varias zonas a la vez |
| `condicionesPago` | Text | No | Ej. "30 días fecha factura" |
| `politicaCancelacion` | Text | No | |
| `email` | String(120) | No | |
| `telefono` | String(40) | No | |

**RN-PRV-01 [BLOQUEA]** El RUT es obligatorio y único entre proveedores no
eliminados. Es la llave para cotejar facturas. Un proveedor extranjero sin RUT
chileno real usa el RUT genérico `55.555.555-5` (definición del cliente,
27-ago-2026) — sigue siendo un RUT válido, no hay excepción que modelar ni
campo opcional.

**Excepción de unicidad para el RUT genérico (definición del cliente,
27-ago-2026):** como `55.555.555-5` lo usan varios proveedores extranjeros
distintos a la vez, la unicidad de `RN-PRV-01` **no aplica a ese valor
puntual** — puede repetirse entre proveedores. Se implementa con un índice
único parcial en base (`WHERE rut <> '55555555-5'`, formato normalizado sin
puntos), no con un `@unique` de Prisma sobre la columna completa. Cualquier
otro RUT sigue siendo estrictamente único.

**RN-PRV-05** Un proveedor puede operar en varias zonas a la vez (definición
del cliente, 27-ago-2026). Se modela `ProveedorZona` (N:N) en vez de
`zonaId` único.

**RN-PRV-02** La búsqueda `q` debe encontrar el proveedor por **razón social,
nombre comercial y cualquiera de sus alias**, en una sola consulta. Es el dolor
declarado de administración: la factura, el cargo bancario y el nombre interno
casi nunca coinciden.

### Alias — subtabla

| Campo | Tipo | Oblig. |
|---|---|---|
| `alias` | String(150) | Sí |

**RN-PRV-03** Sin límite de alias por proveedor. Sirven para el nombre con que
el equipo lo conoce, la glosa que aparece en el banco, y variantes de escritura.
Un mismo alias no puede repetirse entre proveedores distintos **[BLOQUEA]**.

### Cuentas bancarias — subtabla

| Campo | Tipo | Oblig. |
|---|---|---|
| `banco` | String(80) | Sí |
| `tipoCuenta` | String(40) | No |
| `numeroCuenta` | String(40) | Sí |
| `titular` | String(150) | No |
| `rutTitular` | String(12) | No | Validado si viene |

**RN-PRV-04** Un proveedor puede tener varias cuentas. Ninguna es "principal" en
fase 1: se elige al registrar el pago.

### Contactos — subtabla

| Campo | Tipo | Oblig. |
|---|---|---|
| `nombre` | String(120) | Sí |
| `email` | String(120) | No |
| `telefono` | String(40) | No |
| `cargo` | String(80) | No |

**Listado:** código, razón social, nombre comercial, tipo de servicio, zona, RUT.
**Filtros:** `tipoServicioId`, `zonaId`.
**Buscable por:** razón social, nombre comercial, alias, RUT, código.
**Orden por defecto:** razón social ascendente.

---

## 6. Servicio

Catálogo de **costos**, no de precios de venta. El precio se calcula al cotizar.

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| `codigo` | String(20) | Sí | Único, sugerido `SV0001` |
| `nombre` | String(150) | Sí | |
| `nombreEn` | String(150) | No | Advierte si falta (`RN-MAN-08`) |
| `descripcion` | Text | No | Va al documento del cliente |
| `descripcionEn` | Text | No | |
| `zonaId` | Int | No | |
| `tipoServicioId` | Int | Sí | |
| `modeloTarifa` | enum | Sí | Default desde el tipo de servicio, editable |
| `margenSugerido` | Decimal(7,4) | Sí | Default `0`. Ej. `0.5000` = 50% |
| `duracionDias` | Int | No | |

**RN-SRV-01** `modeloTarifa` se **precarga** desde `TipoServicio.modeloTarifaDefault`
y el usuario puede cambiarlo. Un traslado normalmente es `TRAMO_PAX`, pero uno
particular podría cobrarse por pasajero.

**RN-SRV-02 [BLOQUEA]** No se puede cambiar el `modeloTarifa` de un servicio que
ya tiene tarifarios cargados. Hay que crear un servicio nuevo. Cambiarlo dejaría
los valores existentes sin interpretación válida.

**RN-SRV-03** `margenSugerido` se copia a la línea de cotización al agregar el
servicio, y ahí es editable (`RN-COS-02`). Cambiarlo en el maestro **no afecta**
cotizaciones ya armadas.

**Listado:** código, nombre, tipo de servicio, zona, modelo de tarifa, margen sugerido, tarifarios vigentes.
**Filtros:** `tipoServicioId`, `zonaId`, `modeloTarifa`, con o sin traducción.
**Buscable por:** código, nombre, nombre en inglés.

---

## 7. Tarifario — etapa 5

Detalle de reglas en `Docs/reglas-negocio.md` §4 (`RN-TAR-01` a `RN-TAR-06`).

### Cabecera

| Campo | Tipo | Oblig. | Validación |
|---|---|---|---|
| `proveedorId` | Int | Sí | |
| `servicioId` | Int | Sí | |
| `moneda` | enum | Sí | `CLP` / `USD` |
| `vigenciaDesde` | Date | Sí | |
| `vigenciaHasta` | Date | No | Nulo = sin término |
| `version` | Int | Sí | Automático, desde 1 |
| `activo` | Boolean | Sí | Default `true` |

**RN-TAR-07 [BLOQUEA]** No pueden existir dos tarifarios **activos** del mismo
proveedor y servicio con vigencias que se solapen.

### Valores

El formulario cambia según el `modeloTarifa` del servicio:

**TRAMO_PAX** — tabla de tramos

| `paxDesde` | `paxHasta` | `valor` |
|---|---|---|
| 1 | 2 | 95.000 |
| 3 | 5 | 130.000 |
| 6 | *(vacío)* | 185.000 |

Validaciones: sin solape, sin huecos, `paxHasta` nulo solo en el último
(`RN-TAR-02`).

**ACOMODACION** — tabla de ocupación

| `acomodacion` | `valor` | `suplementoSingle` |
|---|---|---|
| `SINGLE` | 100.000 | — |
| `DOBLE` | 140.000 | 60.000 |

Validación: si el suplemento no cuadra con `2 × single − doble`, **[ADVIERTE]**
y guarda el valor tal cual (`RN-TAR-04`).

**UNITARIO_PAX** — valor único

| `valor` |
|---|
| 32.000 |

Se multiplica por la cantidad de pasajeros.

**Listado:** proveedor, servicio, moneda, vigencia, versión, estado.
**Filtros:** `proveedorId`, `servicioId`, `vigenteA` (fecha), solo activos.

---

## 8. Creación al vuelo desde otro formulario

> **Requisito de primer orden.** Todo campo que referencia otro maestro debe
> poder crearlo **sin salir de la pantalla**, con un botón `+` junto al selector,
> y al volver el formulario sigue tal como estaba, con el registro recién creado
> ya seleccionado.
>
> Es el patrón `QuickCreate` de FAS. Se porta, no se reinventa:
> `~/sites/FAS/fas-web/src/features/comunas/components/comuna-quick-create.tsx`
> es el ejemplo canónico.

### Anatomía del componente

Por cada maestro referenciable existe `<Entidad>QuickCreate`:

```tsx
interface QuickCreateProps {
  onCreated: (item: T) => void
}
```

- Renderiza un **botón de icono `+`**, `variant="outline"`, `size="icon"`,
  `className="h-9 w-9 shrink-0 self-end"`, junto al selector.
- Al abrir muestra un **Dialog con formulario reducido** — solo los campos
  mínimos para que el registro sea válido, no la ficha completa.
- Al guardar: invalida la query del maestro, muestra `toast` de confirmación,
  llama `onCreated(nuevo)`, cierra el diálogo y resetea su propio formulario.
- **No se renderiza** si el usuario no tiene nivel `TOTAL` sobre el ítem de menú
  del maestro que crearía.

### Comportamiento en el formulario padre

```tsx
<div className='flex items-center gap-2'>
  <Select className='flex-1' … />
  <ProveedorQuickCreate onCreated={(nuevo) => {
    queryClient.invalidateQueries({ queryKey: proveedoresQueries.keys.all })
    field.handleChange(nuevo.id)          // queda seleccionado
  }} />
</div>
```

**RN-QC-01 [BLOQUEA]** El formulario padre **no pierde su estado**. Crear un
maestro al vuelo no navega, no recarga y no limpia lo ya escrito. Es la razón de
ser del patrón.

**RN-QC-02** El registro recién creado queda **seleccionado automáticamente** en
el campo que abrió el diálogo. El usuario no vuelve a buscarlo.

**RN-QC-03** El selector se refresca invalidando la query del maestro, no
agregando el ítem a mano al arreglo local.

### Anidamiento

**RN-QC-04** Los `QuickCreate` se anidan. Desde una cotización se puede crear un
grupo, y desde ese diálogo crear el cliente, sin abandonar la cotización. FAS lo
resuelve así en Comuna → Provincia → Región y funciona a tres niveles.

Cadenas previstas en ENE:

```
Cotización → + Grupo → + Cliente
Cotización → línea → + Servicio → + Tipo de servicio
Tarifario  → + Proveedor → + Tipo de servicio
Tarifario  → + Servicio  → + Zona
```

**RN-QC-05** Profundidad máxima tres niveles. Más que eso indica que el usuario
debería estar en el mantenedor completo.

### Dónde va cada `+`

> Cada mantenedor tiene su propio `ItemMenu` (`CLIENTES`, `GRUPOS`,
> `PROVEEDORES`, `SERVICIOS`, `ZONAS`, `TIPOS_SERVICIO` — ver CLAUDE.md §7,
> "Permisos por mantenedor, no por bloque"). El nivel exigido por cada `+` es
> siempre el del mantenedor que **crea**, sin importar en qué formulario esté
> el botón — ej. el `+` de Cliente en el formulario de Grupo exige `TOTAL` en
> `CLIENTES`, no en `GRUPOS`.

| Formulario | Campo | Crea | Nivel exigido |
|---|---|---|---|
| Grupo | `clienteId` | Cliente | `TOTAL` en `CLIENTES` |
| Proveedor | `tipoServicioId` | Tipo de servicio | `TOTAL` en `TIPOS_SERVICIO` |
| Proveedor | `zonas` (multi-select) | Zona | `TOTAL` en `ZONAS` |
| Servicio | `tipoServicioId` | Tipo de servicio | `TOTAL` en `TIPOS_SERVICIO` |
| Servicio | `zonaId` | Zona | `TOTAL` en `ZONAS` |
| Tarifario | `proveedorId` | Proveedor | `TOTAL` en `PROVEEDORES` |
| Tarifario | `servicioId` | Servicio | `TOTAL` en `SERVICIOS` |
| Cotización | `clienteId` | Cliente | `TOTAL` en `CLIENTES` |
| Cotización | `ejecutivoId` | Ejecutivo del cliente | `TOTAL` en `CLIENTES` |
| Cotización | `grupoId` | Grupo | `TOTAL` en `GRUPOS` |
| Cotización · línea | `servicioId` | Servicio | `TOTAL` en `SERVICIOS` |
| Cotización · línea | `proveedorId` | Proveedor | `TOTAL` en `PROVEEDORES` |
| Orden de compra | `proveedorId` | Proveedor | `TOTAL` en `PROVEEDORES` |

### Formularios reducidos

Solo lo indispensable para que el registro sea válido. El resto se completa
después en el mantenedor propio.

| Maestro | Campos del diálogo |
|---|---|
| **Zona** | `codigo`, `nombre` |
| **Tipo de servicio** | `codigo`, `nombre`, `modeloTarifaDefault`, `ventanaAvisoDias` |
| **Cliente** | `codigo`, `tipo`, `razonSocial`, `rut` (si `EMPRESA`), `pais`, `monedaHabitual` |
| **Ejecutivo** | `nombre`, `email` |
| **Grupo** | `codigo`, `apellido`, `clienteId` `+`, `cantidadPax` |
| **Proveedor** | `codigo`, `razonSocial`, `rut`, `tipoServicioId` `+`, `zonas` `+` (multi-select) |
| **Servicio** | `codigo`, `nombre`, `tipoServicioId` `+`, `modeloTarifa`, `margenSugerido` |

**RN-QC-06** El formulario reducido respeta **todas** las validaciones del
maestro completo, incluidas las condicionales como `RN-CLI-01` (RUT obligatorio
si el cliente es empresa). No es una puerta trasera para datos incompletos.

**RN-QC-07** El `codigo` llega sugerido desde `GET /api/<recurso>/siguiente-codigo`
igual que en el alta normal (`RN-MAN-02`).

**RN-QC-08** Lo que queda fuera del formulario reducido —alias, cuentas
bancarias, contactos, descripciones bilingües, pasajeros— es siempre opcional en
el modelo. Un registro creado al vuelo es válido, no un borrador.

### Qué portar de FAS

| Origen | Uso |
|---|---|
| `features/*/components/*-quick-create.tsx` | Patrón del diálogo, uno por maestro |
| `features/mantenedor-simple/{queries,mutations}.ts` | Fábricas genéricas de query y mutación por recurso |
| `hooks/use-item-acceso.ts` (`usePuedeEscribir`) | Oculta el `+` sin permiso |
| `components/ui/{dialog,select,combobox}.tsx` | Base shadcn ya adaptada |

> La fábrica `createMantenedorQueries(recurso)` / `createMantenedorMutations(recurso)`
> de FAS es la que hace barato tener trece `QuickCreate`. Portarla antes de
> escribir el primero.

---

## 9. Contratos de API

Patrón idéntico para los seis maestros. `<recurso>` ∈ `clientes`, `grupos`,
`proveedores`, `servicios`, `config/zonas`, `config/tipos-servicio`, `tarifas`.
El nivel se exige contra el `ItemMenu` propio de cada mantenedor (`CLIENTES`,
`GRUPOS`, `PROVEEDORES`, `SERVICIOS`, `ZONAS`, `TIPOS_SERVICIO`), no contra
`MAESTROS` — ver CLAUDE.md §7, "Permisos por mantenedor, no por bloque".

```
GET    /api/<recurso>?page=&limit=&q=&<filtros>     LECTURA en el ítem del recurso
POST   /api/<recurso>                               TOTAL
GET    /api/<recurso>/:id                           LECTURA — incluye subtablas
PATCH  /api/<recurso>/:id                           TOTAL
DELETE /api/<recurso>/:id                           TOTAL — soft delete, RN-MAN-04

GET    /api/<recurso>/siguiente-codigo              TOTAL — sugerencia, RN-MAN-02
```

Subtablas, siempre bajo su padre:

```
POST   /api/clientes/:id/ejecutivos
PATCH  /api/clientes/:id/ejecutivos/:eid
DELETE /api/clientes/:id/ejecutivos/:eid

POST   /api/proveedores/:id/alias
DELETE /api/proveedores/:id/alias/:aid
POST   /api/proveedores/:id/cuentas
PATCH  /api/proveedores/:id/cuentas/:cid
POST   /api/proveedores/:id/contactos

POST   /api/grupos/:id/pasajeros
PATCH  /api/grupos/:id/pasajeros/:pid
```

**RN-API-01** El `GET /:id` devuelve el maestro **con sus subtablas completas**.
No hay endpoints separados para leerlas: la ficha se carga de una vez.

**RN-API-02** El `POST` de la cabecera acepta las subtablas en el mismo payload y
las crea en una sola transacción. Es lo que permite cargar un proveedor con sus
tres alias y dos cuentas sin cinco llamadas.

---

## 10. Orden de carga de datos

Importa para la carga que hace Extremo Norte entre el **4 y el 12 de septiembre**.
Hay dependencias reales:

```
1. Zonas + Tipos de servicio          ← vienen en el seed, solo revisar
2. Proveedores                        ← necesita tipos de servicio y zonas
3. Servicios                          ← necesita tipos de servicio y zonas
4. Tarifarios                         ← necesita proveedores y servicios
5. Clientes + ejecutivos              ← independiente, puede ir en paralelo
6. Grupos                             ← se crean al cotizar, no se precargan
```

**RN-CAR-01** Los grupos **no se precargan**. Nacen de la operación.

**RN-CAR-02** La carga masiva por planilla no está en fase 1. Si el volumen de
tarifarios lo hace inviable a mano, se evalúa un importador acotado como
excepción, y se descuenta del tiempo de otra etapa.

---

## 11. Definiciones pendientes con el cliente

Bloquean el modelo de tarifas, salvo las ya resueltas.

| # | Pregunta | Vence |
|---|---|---|
| 1 | ¿Existe el modelo `UNITARIO_PAX` o todo se resuelve con tramo y acomodación? | 2 sep |
| 2 | ¿El suplemento single se guarda como valor propio o se deriva? | 2 sep |
| 5 | ¿Las seis zonas semilla cubren la operación o faltan? | 3 sep |
| 6 | ¿Qué maestros se migran desde las planillas y cuáles se cargan a mano? | 3 sep |
| 7 | ¿Volumen aproximado de tarifarios? Define si `RN-CAR-02` se activa | 3 sep |

### Resueltas

| # | Pregunta | Respuesta | Fecha |
|---|---|---|---|
| 3 | ¿Hay proveedores extranjeros sin RUT? | No: usan el RUT genérico chileno `55.555.555-5`. `RN-PRV-01` se mantiene sin excepción. | 27 ago |
| 4 | ¿Un proveedor opera en varias zonas a la vez? | Sí. Se modela `ProveedorZona` (N:N) en vez de `zonaId` único (`RN-PRV-05`). | 27 ago |

---

## 12. Fuera de alcance en los mantenedores

Para cortar discusión: **no** entran en fase 1.

Prospección y evaluación de proveedores, registro de visitas, historial de
desempeño, calificaciones. Carga masiva por planilla. Adjuntos en la ficha de
proveedor (contratos, políticas) — los adjuntos son de la OT en fase 1.
Duplicación o fusión de maestros. (La creación al vuelo con `+` **sí** entra: es §8.) Auditoría visual de cambios campo por campo —
queda el registro de `actualizadoPor`, no un historial navegable.
