-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('AGENCIA', 'EMPRESA');

-- CreateEnum
CREATE TYPE "AreaNegocio" AS ENUM ('RECEPTIVO', 'EVENTOS');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('CLP', 'USD');

-- CreateEnum
CREATE TYPE "ModeloTarifa" AS ENUM ('TRAMO_PAX', 'ACOMODACION', 'UNITARIO_PAX');

-- CreateEnum
CREATE TYPE "Acomodacion" AS ENUM ('SINGLE', 'DOBLE', 'TWIN', 'TRIPLE');

-- CreateEnum
CREATE TYPE "Bloque" AS ENUM ('AM', 'PM');

-- CreateEnum
CREATE TYPE "TipoLinea" AS ENUM ('ESTANDAR', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'EN_NEGOCIACION', 'APROBADA', 'PERDIDA', 'DESISTIDA');

-- CreateEnum
CREATE TYPE "EstadoOT" AS ENUM ('CONFIRMADA', 'EN_ESPERA', 'EN_PREPARACION', 'EN_OPERACION', 'EJECUTADA', 'CERRADA', 'CANCELADA', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TipoCambioVersion" AS ENUM ('ALCANCE', 'CORRECCION');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('PENDIENTE', 'TENTATIVO', 'CONFIRMADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoOC" AS ENUM ('BORRADOR', 'EMITIDA', 'MODIFICADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoDTE" AS ENUM ('FACTURA_AFECTA', 'FACTURA_EXENTA', 'BOLETA', 'NOTA_CREDITO');

-- CreateEnum
CREATE TYPE "EstadoDTE" AS ENUM ('PENDIENTE', 'EMITIDO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ABONO', 'FACTURA', 'PAGO', 'NOTA_CREDITO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoPagoProveedor" AS ENUM ('ABONO', 'PAGO');

-- CreateEnum
CREATE TYPE "EstadoFacturaProv" AS ENUM ('RECIBIDA', 'VALIDADA', 'PROGRAMADA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EntidadAdjunto" AS ENUM ('ORDEN_TRABAJO', 'ORDEN_COMPRA', 'COTIZACION', 'FACTURA_PROVEEDOR', 'PAGO_PROVEEDOR');

-- CreateEnum
CREATE TYPE "NivelAcceso" AS ENUM ('SIN_ACCESO', 'LECTURA', 'TOTAL');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "perfilId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_menu" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_item_menu" (
    "id" SERIAL NOT NULL,
    "perfilId" INTEGER NOT NULL,
    "itemMenuId" INTEGER NOT NULL,
    "nivel" "NivelAcceso" NOT NULL DEFAULT 'SIN_ACCESO',

    CONSTRAINT "perfil_item_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCliente" NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rut" TEXT,
    "nombreComercial" TEXT,
    "pais" TEXT,
    "monedaHabitual" "Moneda" NOT NULL DEFAULT 'USD',
    "condicionesPago" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_ejecutivo" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "cargo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "cliente_ejecutivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nacionalidad" TEXT,
    "paisOrigen" TEXT,
    "idioma" TEXT,
    "cantidadPax" INTEGER NOT NULL DEFAULT 1,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pasajero" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "edad" INTEGER,
    "nacionalidad" TEXT,
    "documento" TEXT,
    "restricciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "pasajero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zona" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreEn" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_servicio" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modeloTarifaDefault" "ModeloTarifa" NOT NULL,
    "ventanaAvisoDias" INTEGER NOT NULL DEFAULT 30,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "tipo_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rut" TEXT,
    "nombreComercial" TEXT,
    "tipoServicioId" INTEGER,
    "zonaId" INTEGER,
    "condicionesPago" TEXT,
    "politicaCancelacion" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor_alias" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "proveedor_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor_cuenta" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "banco" TEXT NOT NULL,
    "tipoCuenta" TEXT,
    "numeroCuenta" TEXT NOT NULL,
    "titular" TEXT,
    "rutTitular" TEXT,

    CONSTRAINT "proveedor_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor_contacto" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "cargo" TEXT,

    CONSTRAINT "proveedor_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicio" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreEn" TEXT,
    "descripcion" TEXT,
    "descripcionEn" TEXT,
    "zonaId" INTEGER,
    "tipoServicioId" INTEGER NOT NULL,
    "modeloTarifa" "ModeloTarifa" NOT NULL,
    "margenSugerido" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "duracionDias" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifario" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "tarifario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifario_valor" (
    "id" SERIAL NOT NULL,
    "tarifarioId" INTEGER NOT NULL,
    "modelo" "ModeloTarifa" NOT NULL,
    "paxDesde" INTEGER,
    "paxHasta" INTEGER,
    "acomodacion" "Acomodacion",
    "valor" DECIMAL(18,4) NOT NULL,
    "suplementoSingle" DECIMAL(18,4),

    CONSTRAINT "tarifario_valor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "ejecutivoId" INTEGER,
    "grupoId" INTEGER NOT NULL,
    "areaNegocio" "AreaNegocio" NOT NULL,
    "zonaId" INTEGER,
    "fechaOperacion" TIMESTAMP(3) NOT NULL,
    "cantidadPax" INTEGER NOT NULL,
    "idiomaDocumento" TEXT NOT NULL DEFAULT 'es',
    "moneda" "Moneda" NOT NULL,
    "tipoCambio" DECIMAL(12,6) NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "versionVigenteId" INTEGER,
    "ordenTrabajoId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_version" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "motivo" TEXT,
    "costoTotal" DECIMAL(18,4) NOT NULL,
    "margenTotal" DECIMAL(18,4) NOT NULL,
    "ventaTotal" DECIMAL(18,4) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "cotizacion_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_linea" (
    "id" SERIAL NOT NULL,
    "cotizacionVersionId" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "bloque" "Bloque" NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "tipoLinea" "TipoLinea" NOT NULL,
    "servicioId" INTEGER,
    "proveedorId" INTEGER,
    "tarifarioValorId" INTEGER,
    "descripcion" TEXT NOT NULL,
    "descripcionEn" TEXT,
    "cantidadPax" INTEGER NOT NULL,
    "acomodacion" "Acomodacion",
    "costoUnitario" DECIMAL(18,4) NOT NULL,
    "costoTotal" DECIMAL(18,4) NOT NULL,
    "margenPct" DECIMAL(7,4) NOT NULL,
    "ventaTotal" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "cotizacion_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "ejecutivoId" INTEGER,
    "grupoId" INTEGER NOT NULL,
    "apellido" TEXT NOT NULL,
    "areaNegocio" "AreaNegocio" NOT NULL,
    "zonaId" INTEGER,
    "fechaOperacion" TIMESTAMP(3) NOT NULL,
    "cantidadPax" INTEGER NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "tipoCambioCotizacion" DECIMAL(12,6) NOT NULL,
    "estado" "EstadoOT" NOT NULL DEFAULT 'CONFIRMADA',
    "versionVigenteId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "orden_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo_version" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "tipoCambio" "TipoCambioVersion" NOT NULL DEFAULT 'ALCANCE',
    "motivo" TEXT,
    "costoTeoricoTotal" DECIMAL(18,4) NOT NULL,
    "margenTotal" DECIMAL(18,4) NOT NULL,
    "ventaTotal" DECIMAL(18,4) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "orden_trabajo_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_trabajo_linea" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoVersionId" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "bloque" "Bloque" NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "tipoLinea" "TipoLinea" NOT NULL,
    "servicioId" INTEGER,
    "proveedorId" INTEGER,
    "descripcion" TEXT NOT NULL,
    "descripcionEn" TEXT,
    "cantidadPax" INTEGER NOT NULL,
    "acomodacion" "Acomodacion",
    "costoTeorico" DECIMAL(18,4) NOT NULL,
    "margenPct" DECIMAL(7,4) NOT NULL,
    "ventaLinea" DECIMAL(18,4) NOT NULL,
    "estadoServicio" "EstadoServicio" NOT NULL DEFAULT 'PENDIENTE',
    "fechaServicio" TIMESTAMP(3),

    CONSTRAINT "orden_trabajo_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "estado" "EstadoOC" NOT NULL DEFAULT 'BORRADOR',
    "versionVigenteId" INTEGER,
    "fechaEmision" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra_version" (
    "id" SERIAL NOT NULL,
    "ordenCompraId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "ordenTrabajoVersionId" INTEGER NOT NULL,
    "motivo" TEXT,
    "montoTotal" DECIMAL(18,4) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "orden_compra_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra_linea" (
    "id" SERIAL NOT NULL,
    "ordenCompraVersionId" INTEGER NOT NULL,
    "ordenTrabajoLineaId" INTEGER,
    "descripcion" TEXT NOT NULL,
    "fechaServicio" TIMESTAMP(3),
    "cantidadPax" INTEGER NOT NULL,
    "costoReal" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "orden_compra_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_tributario" (
    "id" SERIAL NOT NULL,
    "ordenTrabajoId" INTEGER NOT NULL,
    "tipo" "TipoDTE" NOT NULL,
    "folio" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "moneda" "Moneda" NOT NULL,
    "neto" DECIMAL(18,4) NOT NULL,
    "iva" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "tipoCambioEmision" DECIMAL(12,6) NOT NULL,
    "estadoDte" "EstadoDTE" NOT NULL DEFAULT 'PENDIENTE',
    "proveedorDte" TEXT,
    "urlPdf" TEXT,
    "urlXml" TEXT,
    "respuestaJson" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "documento_tributario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_cuenta" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "ordenTrabajoId" INTEGER,
    "documentoTributarioId" INTEGER,
    "tipo" "TipoMovimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "tipoCambio" DECIMAL(12,6) NOT NULL,
    "montoClp" DECIMAL(18,4) NOT NULL,
    "glosa" TEXT,
    "referencia" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "movimiento_cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_proveedor" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "ordenCompraId" INTEGER,
    "numero" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "adjuntoId" INTEGER,
    "estado" "EstadoFacturaProv" NOT NULL DEFAULT 'RECIBIDA',
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "factura_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_proveedor" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "ordenCompraId" INTEGER,
    "facturaProveedorId" INTEGER,
    "tipo" "TipoPagoProveedor" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "tipoCambio" DECIMAL(12,6) NOT NULL,
    "referencia" TEXT,
    "comprobanteAdjuntoId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,

    CONSTRAINT "pago_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjunto" (
    "id" SERIAL NOT NULL,
    "entidad" "EntidadAdjunto" NOT NULL,
    "entidadId" INTEGER NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prefijo_codigo" (
    "id" SERIAL NOT NULL,
    "entidad" TEXT NOT NULL,
    "prefijo" TEXT NOT NULL,
    "digitos" INTEGER NOT NULL DEFAULT 4,
    "incluyeAnio" BOOLEAN NOT NULL DEFAULT true,
    "ultimoValor" INTEGER NOT NULL DEFAULT 0,
    "anio" INTEGER,

    CONSTRAINT "prefijo_codigo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_codigo_key" ON "usuario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_codigo_key" ON "perfil"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "item_menu_codigo_key" ON "item_menu"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_item_menu_perfilId_itemMenuId_key" ON "perfil_item_menu"("perfilId", "itemMenuId");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_codigo_key" ON "cliente"("codigo");

-- CreateIndex
CREATE INDEX "cliente_tipo_idx" ON "cliente"("tipo");

-- CreateIndex
CREATE INDEX "cliente_ejecutivo_clienteId_idx" ON "cliente_ejecutivo"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_codigo_key" ON "grupo"("codigo");

-- CreateIndex
CREATE INDEX "grupo_apellido_idx" ON "grupo"("apellido");

-- CreateIndex
CREATE INDEX "grupo_clienteId_idx" ON "grupo"("clienteId");

-- CreateIndex
CREATE INDEX "pasajero_grupoId_idx" ON "pasajero"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "zona_codigo_key" ON "zona"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_servicio_codigo_key" ON "tipo_servicio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_codigo_key" ON "proveedor"("codigo");

-- CreateIndex
CREATE INDEX "proveedor_razonSocial_idx" ON "proveedor"("razonSocial");

-- CreateIndex
CREATE INDEX "proveedor_alias_alias_idx" ON "proveedor_alias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "servicio_codigo_key" ON "servicio"("codigo");

-- CreateIndex
CREATE INDEX "tarifario_servicioId_vigenciaDesde_idx" ON "tarifario"("servicioId", "vigenciaDesde");

-- CreateIndex
CREATE INDEX "tarifario_valor_tarifarioId_idx" ON "tarifario_valor"("tarifarioId");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_numero_key" ON "cotizacion"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_versionVigenteId_key" ON "cotizacion"("versionVigenteId");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_ordenTrabajoId_key" ON "cotizacion"("ordenTrabajoId");

-- CreateIndex
CREATE INDEX "cotizacion_estado_idx" ON "cotizacion"("estado");

-- CreateIndex
CREATE INDEX "cotizacion_fechaOperacion_idx" ON "cotizacion"("fechaOperacion");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_version_cotizacionId_version_key" ON "cotizacion_version"("cotizacionId", "version");

-- CreateIndex
CREATE INDEX "cotizacion_linea_cotizacionVersionId_idx" ON "cotizacion_linea"("cotizacionVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_numero_key" ON "orden_trabajo"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_versionVigenteId_key" ON "orden_trabajo"("versionVigenteId");

-- CreateIndex
CREATE INDEX "orden_trabajo_estado_fechaOperacion_idx" ON "orden_trabajo"("estado", "fechaOperacion");

-- CreateIndex
CREATE INDEX "orden_trabajo_apellido_idx" ON "orden_trabajo"("apellido");

-- CreateIndex
CREATE UNIQUE INDEX "orden_trabajo_version_ordenTrabajoId_version_key" ON "orden_trabajo_version"("ordenTrabajoId", "version");

-- CreateIndex
CREATE INDEX "orden_trabajo_linea_ordenTrabajoVersionId_idx" ON "orden_trabajo_linea"("ordenTrabajoVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_compra_numero_key" ON "orden_compra"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "orden_compra_versionVigenteId_key" ON "orden_compra"("versionVigenteId");

-- CreateIndex
CREATE INDEX "orden_compra_ordenTrabajoId_idx" ON "orden_compra"("ordenTrabajoId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_compra_version_ordenCompraId_version_key" ON "orden_compra_version"("ordenCompraId", "version");

-- CreateIndex
CREATE INDEX "orden_compra_linea_ordenCompraVersionId_idx" ON "orden_compra_linea"("ordenCompraVersionId");

-- CreateIndex
CREATE INDEX "documento_tributario_ordenTrabajoId_idx" ON "documento_tributario"("ordenTrabajoId");

-- CreateIndex
CREATE INDEX "movimiento_cuenta_clienteId_fecha_idx" ON "movimiento_cuenta"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "factura_proveedor_proveedorId_idx" ON "factura_proveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "pago_proveedor_proveedorId_fecha_idx" ON "pago_proveedor"("proveedorId", "fecha");

-- CreateIndex
CREATE INDEX "adjunto_entidad_entidadId_idx" ON "adjunto"("entidad", "entidadId");

-- CreateIndex
CREATE UNIQUE INDEX "prefijo_codigo_entidad_key" ON "prefijo_codigo"("entidad");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_item_menu" ADD CONSTRAINT "perfil_item_menu_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_item_menu" ADD CONSTRAINT "perfil_item_menu_itemMenuId_fkey" FOREIGN KEY ("itemMenuId") REFERENCES "item_menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_ejecutivo" ADD CONSTRAINT "cliente_ejecutivo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasajero" ADD CONSTRAINT "pasajero_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "tipo_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_alias" ADD CONSTRAINT "proveedor_alias_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_cuenta" ADD CONSTRAINT "proveedor_cuenta_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_contacto" ADD CONSTRAINT "proveedor_contacto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_tipoServicioId_fkey" FOREIGN KEY ("tipoServicioId") REFERENCES "tipo_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifario" ADD CONSTRAINT "tarifario_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifario" ADD CONSTRAINT "tarifario_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifario_valor" ADD CONSTRAINT "tarifario_valor_tarifarioId_fkey" FOREIGN KEY ("tarifarioId") REFERENCES "tarifario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_ejecutivoId_fkey" FOREIGN KEY ("ejecutivoId") REFERENCES "cliente_ejecutivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_versionVigenteId_fkey" FOREIGN KEY ("versionVigenteId") REFERENCES "cotizacion_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion" ADD CONSTRAINT "cotizacion_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "orden_trabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_version" ADD CONSTRAINT "cotizacion_version_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_linea" ADD CONSTRAINT "cotizacion_linea_cotizacionVersionId_fkey" FOREIGN KEY ("cotizacionVersionId") REFERENCES "cotizacion_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_linea" ADD CONSTRAINT "cotizacion_linea_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_linea" ADD CONSTRAINT "cotizacion_linea_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_linea" ADD CONSTRAINT "cotizacion_linea_tarifarioValorId_fkey" FOREIGN KEY ("tarifarioValorId") REFERENCES "tarifario_valor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_ejecutivoId_fkey" FOREIGN KEY ("ejecutivoId") REFERENCES "cliente_ejecutivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_versionVigenteId_fkey" FOREIGN KEY ("versionVigenteId") REFERENCES "orden_trabajo_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_version" ADD CONSTRAINT "orden_trabajo_version_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "orden_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_linea" ADD CONSTRAINT "orden_trabajo_linea_ordenTrabajoVersionId_fkey" FOREIGN KEY ("ordenTrabajoVersionId") REFERENCES "orden_trabajo_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_linea" ADD CONSTRAINT "orden_trabajo_linea_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_trabajo_linea" ADD CONSTRAINT "orden_trabajo_linea_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "orden_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_versionVigenteId_fkey" FOREIGN KEY ("versionVigenteId") REFERENCES "orden_compra_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_version" ADD CONSTRAINT "orden_compra_version_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_version" ADD CONSTRAINT "orden_compra_version_ordenTrabajoVersionId_fkey" FOREIGN KEY ("ordenTrabajoVersionId") REFERENCES "orden_trabajo_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_linea" ADD CONSTRAINT "orden_compra_linea_ordenCompraVersionId_fkey" FOREIGN KEY ("ordenCompraVersionId") REFERENCES "orden_compra_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_linea" ADD CONSTRAINT "orden_compra_linea_ordenTrabajoLineaId_fkey" FOREIGN KEY ("ordenTrabajoLineaId") REFERENCES "orden_trabajo_linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_tributario" ADD CONSTRAINT "documento_tributario_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "orden_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_cuenta" ADD CONSTRAINT "movimiento_cuenta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_cuenta" ADD CONSTRAINT "movimiento_cuenta_ordenTrabajoId_fkey" FOREIGN KEY ("ordenTrabajoId") REFERENCES "orden_trabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_cuenta" ADD CONSTRAINT "movimiento_cuenta_documentoTributarioId_fkey" FOREIGN KEY ("documentoTributarioId") REFERENCES "documento_tributario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_proveedor" ADD CONSTRAINT "factura_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura_proveedor" ADD CONSTRAINT "factura_proveedor_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_proveedor" ADD CONSTRAINT "pago_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_proveedor" ADD CONSTRAINT "pago_proveedor_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_proveedor" ADD CONSTRAINT "pago_proveedor_facturaProveedorId_fkey" FOREIGN KEY ("facturaProveedorId") REFERENCES "factura_proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
