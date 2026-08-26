# Reglas de negocio — ENE

> **Fuente autoritativa de las reglas de dominio.** Ante cualquier discrepancia
> con `CLAUDE.md`, manda este documento. `CLAUDE.md` mantiene el contrato
> técnico (stack, estructura, convenciones); acá viven las reglas del negocio.
>
> Última actualización: Agosto 2026 · Versión 1.0
> Base: levantamientos del 17 de agosto con Francisco Leyton, Paula Pinheiro,
> Carolina Demaría y Lorena Baeza, más las definiciones de Christian Droguett
> y la reunión de cierre con el cliente.

---

## Cómo leer este documento

Cada regla lleva un identificador estable (`RN-XX-NN`) para poder referenciarla
desde el código, los tests y las conversaciones. Las reglas marcadas **[BLOQUEA]**
deben impedir la operación, no advertirla. Las marcadas **[ADVIERTE]** dejan
continuar registrando la excepción.

Los ejemplos numéricos son **casos de prueba obligatorios**: si el código no
reproduce esos números exactos, está mal.

---

## 1. Glosario

| Término | Significado |
|---|---|
| **Cliente** | Agencia de viajes (receptivo) o Empresa (eventos). **No existe cliente persona natural.** |
| **Ejecutivo** | Persona de contacto dentro del cliente que solicita y aprueba. |
| **Grupo** | Los pasajeros que viajan. Se identifica por **apellido**. No es el cliente. |
| **Cotización** | Presupuesto en negociación. Puede tener varias versiones. |
| **OT** | Orden de Trabajo. Nace de una cotización aprobada y es el documento central del sistema. |
| **OC** | Orden de Compra a un proveedor. Cuelga de una OT. |
| **Costo teórico** | El estimado al cotizar, congelado en la versión 1 de la OT. |
| **Costo real** | El efectivamente contratado, registrado en las líneas de OC. |
| **Área de negocio** | `RECEPTIVO` o `EVENTOS`. Es un atributo de la operación, no un flujo separado. |
| **Línea base** | La versión 1 de la OT. Todo se compara contra ella. |

---

## 2. Dinero — reglas transversales

Estas reglas aplican a **todo** monto del sistema y son las que más caro salen
si se rompen.

**RN-DIN-01 [BLOQUEA]** Ningún monto se convierte a `number` de JavaScript en
ningún punto del flujo. Prisma entrega `Decimal`, la aritmética pasa por
`shared/dinero/`, la API responde `string`. **Prohibido `parseFloat`,
`Number()` y aritmética con operadores sobre montos.**

**RN-DIN-02** Precisión canónica: montos `Decimal(18,4)`, porcentajes de margen
`Decimal(7,4)`, tipos de cambio `Decimal(12,6)`.

**RN-DIN-03** Redondeo `ROUND_HALF_UP` a 4 decimales, aplicado al final de cada
operación, no en pasos intermedios.

**RN-DIN-04** Al repartir un total entre N partes, la última parte absorbe el
residuo. La suma de las partes debe ser exactamente igual al total.

**RN-DIN-05** Todo monto viaja acompañado de su moneda. No existe monto sin
moneda en la base ni en la API.

---

## 3. Costeo

### El margen

**RN-COS-01 [BLOQUEA]** El margen es un **porcentaje sobre el costo (markup)**,
no un margen sobre la venta:

```
venta = costo × (1 + margen)
```

> **Caso de prueba obligatorio.** Costo 3.000.000 con margen 0,50 → venta
> 4.500.000. Si el resultado es 6.000.000, se está aplicando margen sobre venta
> y está mal. La diferencia en una sola OT es de 1,5 millones.

**RN-COS-02** El margen se guarda **siempre en la línea**, aunque el usuario lo
haya aplicado de forma global. Un margen global es una acción de la interfaz que
escribe el mismo porcentaje en todas las líneas; no se guarda como valor de
cabecera. Sin esto, cambiar el margen global reescribiría el histórico.

**RN-COS-03** El margen puede ser distinto por línea. Es habitual: menos margen
en lo que es traspaso puro (alojamiento) y más en lo que agrega valor propio
(guías, visitas).

**RN-COS-04** El valor de venta de la operación es la **suma de las líneas
valorizadas**, no el costo total por un margen global.

> **Caso de prueba obligatorio.**
>
> | Línea | Costo | Margen | Venta |
> |---|---|---|---|
> | Transporte 4 días | 780.000 | 0,50 | 1.170.000 |
> | Guía bilingüe | 640.000 | 0,60 | 1.024.000 |
> | Hotel · 3 noches | 840.000 | 0,40 | 1.176.000 |
> | Entradas y visitas | 320.000 | 0,60 | 512.000 |
> | Alimentación | 360.000 | 0,50 | 540.000 |
> | Almuerzo (OTRO) | 60.000 | 0,30 | 78.000 |
> | **Total** | **3.000.000** | **0,50 prom.** | **4.500.000** |
>
> El margen promedio ponderado se **deriva** (`venta/costo − 1`), no se guarda.

### Tipos de línea

**RN-COS-05** Una línea es `ESTANDAR` (trae su costo del tarifario) u `OTRO`
(descripción y valor digitados a mano). Una línea `OTRO` no referencia
tarifario ni servicio del catálogo.

**RN-COS-06 [BLOQUEA]** El tarifario es **ayuda de captura**. Una vez cargado,
`costoTeorico` queda plasmado en la línea y **no cambia** aunque el maestro de
tarifas se modifique después. Nunca se recalcula una línea existente desde el
tarifario.

### Recálculo por cantidad de pasajeros

**RN-COS-07** Cambiar la cantidad de pasajeros **recalcula todas las líneas** de
la versión en edición. Con tarifas por tramo el costo salta de forma escalonada,
no proporcional.

> **Caso de prueba obligatorio.** Con tramos 1–2 → 95.000, 3–5 → 130.000 y 6+ →
> 185.000, pasar de 2 a 3 pasajeros sube el traslado de 95.000 a 130.000, un
> 37%, aunque los pasajeros hayan subido 50%. El costo **por pasajero** baja de
> 47.500 a 43.333.

---

## 4. Tarifas

**RN-TAR-01** Conviven tres modelos, discriminados en `TarifarioValor.modelo`.

### TRAMO_PAX

El valor cubre el **servicio completo** para el rango `[paxDesde, paxHasta]`. No
se multiplica por pasajeros.

```
1–2 pax → 95.000     3–5 pax → 130.000     6+ pax → 185.000
```

**RN-TAR-02 [BLOQUEA]** Los tramos de un mismo tarifario no pueden solaparse ni
dejar huecos dentro del rango cubierto. El último tramo puede tener `paxHasta`
nulo (abierto hacia arriba).

**RN-TAR-03 [BLOQUEA]** Si la cantidad de pasajeros cae fuera de todos los
tramos definidos, la línea no se puede valorizar. Debe pedirse el valor como
línea `OTRO`.

### ACOMODACION

El valor es **por habitación** según ocupación. El suplemento single es un
**valor propio del tarifario**, no derivado.

```
Habitación 1 pax → 100.000
Habitación 2 pax → 140.000
Suplemento single → 60.000
```

**RN-TAR-04** Con 2 pasajeros en habitación doble el costo es 140.000, o sea
70.000 por persona. Si piden habitaciones separadas, son dos habitaciones de
100.000 = 200.000, que es 140.000 + 60.000 de suplemento. **El suplemento debe
cuadrar con la diferencia**; si no cuadra, manda el valor guardado y se
**[ADVIERTE]**.

### UNITARIO_PAX

El valor se multiplica por la cantidad de pasajeros. Entradas, almuerzos,
degustaciones.

### Vigencia

**RN-TAR-05 [ADVIERTE]** Al valorizar una línea con un tarifario cuya
`vigenciaHasta` es anterior a la fecha de operación, se advierte pero se permite.
El usuario decide.

**RN-TAR-06** Un tarifario nuevo para el mismo proveedor y servicio no reemplaza
al anterior: se crea con `version + 1` y el anterior queda con `activo = false`.
Las líneas ya valorizadas siguen apuntando al valor antiguo (RN-COS-06).

---

## 5. Versionado — mecanismo transversal (etapa 2)

> **Cambio de la reunión con el cliente:** el versionado de OT y OC se construye
> desde la **etapa 1**, como mecanismo compartido, no dentro de las etapas 7 y 8.
> Las etapas posteriores lo consumen, no lo inventan.

**RN-VER-01** El mismo contrato aplica a **Cotización, OT y OC**. Estructura:
cabecera estable → N versiones → líneas colgando de la versión.

**RN-VER-02 [BLOQUEA]** Una versión existente **nunca se edita**. Modificar
significa crear la versión siguiente copiando las líneas y aplicando el cambio.

> **Precedencia con RN-VER-08 (decisión de negocio, agosto 2026):** "versión
> existente" significa una versión que **ya tiene una posterior** (histórica).
> Mientras una versión es la **vigente y no existe ninguna posterior**, se
> comporta como borrador y admite escritura directa (RN-VER-08). Al nacer la
> versión N+1, la N queda congelada y solo se modifica creando la N+2. Ante
> conflicto sobre la mutabilidad de la vigente, **gobierna RN-VER-08**.

**RN-VER-03 [BLOQUEA]** Una versión anterior **nunca se borra ni se marca como
eliminada**. El historial completo debe poder reconstruirse siempre.

**RN-VER-04** `version` es un correlativo desde 1, sin saltos, único dentro de
la cabecera. Se asigna dentro de la transacción que crea la versión.

**RN-VER-05 [BLOQUEA]** `versionVigenteId` apunta a exactamente una versión. No
puede quedar nulo una vez creada la primera versión, ni apuntar a una versión de
otra cabecera.

**RN-VER-06** Toda versión registra `motivo`, `creadoPor` y `creadoEn`. El
motivo es obligatorio a partir de la versión 2.

**RN-VER-07 [BLOQUEA]** La creación de una versión es **transaccional y
serializada** con `pg_advisory_xact_lock`. Dos solicitudes concurrentes sobre la
misma cabecera no pueden producir dos versiones con el mismo número.

**RN-VER-08** Al crear la versión N+1, la versión N queda inmutable de hecho: el
repositorio solo permite escritura sobre la versión vigente y solo antes de que
exista una posterior.

**RN-VER-09** Consultar una versión histórica devuelve el documento tal como
estaba: sus líneas, sus montos y sus referencias de ese momento. No se
reconstruye desde los maestros actuales.

### Tipo de cambio de la versión

**RN-VER-10 [BLOQUEA]** Toda versión de OT posterior a la 1 declara su
`tipoCambio`:

| Tipo | Qué es | Efecto sobre la venta |
|---|---|---|
| `ALCANCE` | El cliente agrega, quita o modifica servicios | **Recotiza.** Nueva venta, requiere aprobación del cliente |
| `CORRECCION` | Se corrige un dato sin cambiar lo contratado | **No toca la venta** |

**RN-VER-11 [BLOQUEA]** Una diferencia de costo del mismo servicio **no es una
versión nueva**: no toca la venta, absorbe el margen y se registra como costo
real en la OC. En general no se recotiza; la variación se absorbe.

### Versión y línea base

**RN-VER-12** La **versión 1 de la OT es la línea base congelada**. Todo
análisis de desviación compara contra ella, no contra la versión vigente.

**RN-VER-13** Cada `OrdenCompraVersion` registra contra qué
`ordenTrabajoVersionId` fue emitida. Permite saber si una OC quedó desalineada
cuando la OT avanzó de versión.

---

## 6. Cotización

**RN-COT-01** Estados: `BORRADOR → ENVIADA → EN_NEGOCIACION → APROBADA`, con
salidas a `PERDIDA` o `DESISTIDA` en cualquier punto.

**RN-COT-02 [BLOQUEA]** Una cotización `APROBADA` no se edita. Genera la OT y
queda inmutable.

**RN-COT-03** Una cotización `PERDIDA` o `DESISTIDA` **no genera OT ni consume
numeración de OT**.

**RN-COT-04 [BLOQUEA]** No se puede aprobar una cotización sin cliente,
ejecutivo, grupo, fecha de operación, cantidad de pasajeros y al menos una línea
valorizada.

**RN-COT-05** El itinerario se organiza por **día** y **bloque AM/PM**. Un día
puede no tener servicios en un bloque.

**RN-COT-06** El documento al cliente se emite en **español o inglés** y en dos
modalidades: **valor total** o **desglosado por ítem**. La modalidad se elige al
generar el PDF, sin rehacer el costeo.

**RN-COT-07** El margen por línea es información **interna**. En la modalidad
desglosada el cliente ve el valor de venta de cada ítem, nunca el costo ni el
margen.

---

## 7. Orden de Trabajo

**RN-OT-01 [BLOQUEA]** La OT nace **únicamente** de una cotización aprobada,
copiando sus líneas. No se crea una OT a mano.

**RN-OT-02** Al generarse, se congelan: programa, costo teórico por línea,
margen, valor de venta, moneda y tipo de cambio de cotización. Esa es la versión 1.

**RN-OT-03 [BLOQUEA]** El **apellido del grupo es obligatorio** en la OT y es su
identificador operativo visible. La búsqueda por apellido debe funcionar sin
conocer el número.

**RN-OT-04** Estados: `CONFIRMADA → EN_ESPERA → EN_PREPARACION → EN_OPERACION →
EJECUTADA → CERRADA`, con salidas a `CANCELADA` y `NO_SHOW`.

**RN-OT-05** `EN_ESPERA` es un estado de larga duración: en receptivo una OT
puede permanecer ahí más de doce meses. No es una anomalía.

**RN-OT-06 [BLOQUEA]** Una OT `CANCELADA` **no pasa a cierre como servicio
realizado**, salvo que sea `NO_SHOW`.

**RN-OT-07** El costo real de la operación es la suma de las líneas de las OC
vigentes asociadas. Se compara contra la versión 1 (RN-VER-12).

**RN-OT-08** Los adjuntos cuelgan de la OT: cotizaciones de proveedores,
respaldos de reserva, agreements, mapas, facturas y comprobantes.

---

## 8. Órdenes de compra

**RN-OC-01** Una OT tiene de 0 a N órdenes de compra, una por proveedor
involucrado. Una OT puede estar mucho tiempo sin ninguna.

**RN-OC-02 [BLOQUEA]** Antes de emitir una OC, el sistema verifica
correspondencia con la OT vigente en **servicio, fecha, cantidad de pasajeros y
tarifa**. Una diferencia **bloquea la emisión**, no la advierte.

**RN-OC-03** Al emitir la OC se registra el **costo real** de las líneas que
cubre. Ese es el dato que alimenta la comparación con el teórico.

**RN-OC-04** Estados: `BORRADOR → EMITIDA → MODIFICADA`, con salida a `ANULADA`.
Una OC anulada conserva su historial de versiones.

**RN-OC-05** Cada servicio contratado lleva su propio estado: `PENDIENTE`,
`TENTATIVO`, `CONFIRMADO`, `RECHAZADO`, `CANCELADO`. Una OT no está lista solo
porque existe: importa el estado individual de cada servicio.

---

## 9. Moneda y tipo de cambio

**RN-MON-01** Receptivo se cotiza y cobra en **USD**; eventos en **CLP**. La OT
se denomina en la moneda de su cotización.

**RN-MON-02** Se guardan **dos tipos de cambio distintos**, y ninguno se
recalcula nunca:

| Cuál | Dónde | Para qué |
|---|---|---|
| `tipoCambioCotizacion` | Cabecera de la OT | Derivó el precio en USD. Dato histórico |
| Tipo de cambio del movimiento | Cada `MovimientoCuenta` | El real al momento del cobro |

**RN-MON-03 [BLOQUEA]** **Todo el análisis de gestión se expresa en pesos.** Las
vistas convierten con el TC del movimiento cuando existe, y con
`TC_REFERENCIA_USD` mientras la OT está abierta.

**RN-MON-04** La diferencia entre la utilidad comprometida y la real tiene dos
causas independientes que deben poder separarse: **efecto costo** y **efecto
tipo de cambio**.

> **Caso de prueba obligatorio.** Costo teórico 3.000.000, margen 0,50, TC al
> cotizar 1.000, 4 pasajeros.
>
> - Venta: 3.000.000 × 1,5 = 4.500.000 CLP → **USD 4.500** → USD 1.125 por pasajero
> - Utilidad comprometida: 1.500.000
>
> Al cierre, con cobro de USD 4.500 a TC 950 y costo real 2.700.000:
>
> - Venta real: 4.500 × 950 = **4.275.000**
> - Utilidad real: 4.275.000 − 2.700.000 = **1.575.000**
> - **Efecto costo:** +300.000 · **Efecto tipo de cambio:** −225.000 · **Neto:** +75.000
>
> Si el sistema informa 1.575.000 sin descomponer, la operación parece mejor de
> lo que fue por razones que el coordinador no controla.

---

## 10. Facturación y cobros

**RN-FAC-01** La factura se emite vía adaptador DTE genérico, configurable por
`DTE_PROVIDER`. En desarrollo siempre `mock`.

**RN-FAC-02** El documento tributario queda asociado a la OT, con folio, PDF y
XML.

**RN-FAC-03 [BLOQUEA]** Un **abono puede recibirse contra la OT sin que exista
factura**. Es lo habitual en receptivo, donde el anticipo llega meses antes.

**RN-FAC-04** Al emitir la factura se aplica contra los abonos disponibles del
cliente. El saldo resultante puede ser a favor o en contra.

**RN-FAC-05** El saldo de cuenta corriente **se calcula, no se almacena**. Se
obtiene de la vista `rpt_cuenta_corriente_cliente` con saldo acumulado.

**RN-FAC-06** La factura del proveedor se adjunta a la OT referenciando su OC.
El sistema muestra ambos valores lado a lado. **La validación de la diferencia
es humana [ADVIERTE], no automática.**

---

## 11. Correlativos

**RN-COR-01 [BLOQUEA]** Todo correlativo se genera **dentro de transacción** con
`pg_advisory_xact_lock`, usando los namespaces de `shared/advisory-locks.ts`.
Nunca con `MAX(numero) + 1` sin lock.

**RN-COR-02** Formato: `{prefijo}-{YYYY}-{NNNN}` con relleno de ceros. Ejemplos:
`COT-2026-0142`, `OT-2026-0142`, `OC-2026-0087`.

**RN-COR-03** El correlativo de cotización y el de OT son **independientes**.
Una cotización perdida no deja un hueco en la numeración de OT.

**RN-COR-04** El número de versión es independiente del correlativo. Se muestra
como `OT-2026-0142 v3`.

---

## 12. Permisos

**RN-PER-01** Autorización por **perfil + ítem de menú + nivel**
(`SIN_ACCESO` / `LECTURA` / `TOTAL`). No existen roles.

**RN-PER-02** Perfiles iniciales: `GERENCIA` (lectura general),
`OPERACIONES`, `ADMINISTRACION`, `ADMINISTRADOR`.

**RN-PER-03** Toda mutación registra `creadoPor` o `actualizadoPor` con el
usuario de la sesión, no con un valor por defecto.

---

## 13. Adjuntos

**RN-ADJ-01** Los adjuntos son polimórficos: cuelgan de OT, OC, cotización,
factura de proveedor o pago.

**RN-ADJ-02 [BLOQUEA]** El path de almacenamiento **nunca se expone**. La
descarga pasa por la API con verificación de permiso sobre la entidad dueña.

**RN-ADJ-03** Límite por archivo según `ADJUNTOS_MAX_MB`. Se valida en el
servidor, no solo en el navegador.

---

## 14. Fuera de las reglas del sistema

Estos procesos siguen ocurriendo fuera y el sistema **no debe intentar
resolverlos**: conciliación bancaria, libro de compras y ventas, IVA, Previred,
remuneraciones, ejecución y autorización de pagos en el banco, y clasificación
automática de correos entrantes.

---

## 15. Casos de prueba obligatorios

Estos deben existir como tests antes de cerrar la etapa correspondiente.

| # | Regla | Caso | Resultado esperado |
|---|---|---|---|
| 1 | RN-COS-01 | Costo 3.000.000, margen 0,50 | Venta 4.500.000 |
| 2 | RN-COS-04 | Las seis líneas del §3 | Costo 3.000.000, venta 4.500.000, margen derivado 0,50 |
| 3 | RN-COS-07 | Traslado por tramo, de 2 a 3 pax | Costo sube de 95.000 a 130.000 |
| 4 | RN-TAR-04 | 2 pax en habitaciones separadas | 200.000 = 140.000 + 60.000 |
| 5 | RN-TAR-02 | Tarifario con tramos solapados | Rechaza al guardar |
| 6 | RN-VER-04 | Dos POST /versiones concurrentes | Versiones 2 y 3, ninguna duplicada |
| 7 | RN-VER-02 | Intento de editar versión histórica | Rechaza |
| 8 | RN-MON-04 | Cierre del §9 | Efecto costo +300.000, efecto TC −225.000, neto +75.000 |
| 9 | RN-OC-02 | OC con pax distinto al de la OT | Bloquea la emisión |
| 10 | RN-COR-01 | Dos correlativos concurrentes | Números distintos, sin saltos |
| 11 | RN-FAC-03 | Abono sin factura previa | Se registra y queda disponible |
| 12 | RN-OT-06 | Cierre de OT cancelada | Rechaza salvo NO_SHOW |
