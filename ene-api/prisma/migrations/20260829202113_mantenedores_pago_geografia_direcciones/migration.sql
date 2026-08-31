/*
  Warnings:

  - You are about to drop the column `condicionesPago` on the `cliente` table. All the data in the column will be lost.
  - You are about to drop the column `condicionesPago` on the `proveedor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cliente" DROP COLUMN "condicionesPago",
ADD COLUMN     "condicionPagoId" INTEGER,
ADD COLUMN     "formaPagoId" INTEGER;

-- AlterTable
ALTER TABLE "proveedor" DROP COLUMN "condicionesPago",
ADD COLUMN     "condicionPagoId" INTEGER,
ADD COLUMN     "formaPagoId" INTEGER;

-- CreateTable
CREATE TABLE "cliente_direccion" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "paisId" INTEGER NOT NULL,
    "comunaId" INTEGER,
    "direccion" TEXT NOT NULL,
    "esPorDefecto" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "cliente_direccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forma_pago" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "forma_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicion_pago" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "condicion_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicion_pago_cuota" (
    "id" SERIAL NOT NULL,
    "condicionPagoId" INTEGER NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "plazoDias" INTEGER NOT NULL,

    CONSTRAINT "condicion_pago_cuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pais" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esPaisNacional" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "pais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provincia" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comuna" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "provinciaId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "comuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor_direccion" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "paisId" INTEGER NOT NULL,
    "comunaId" INTEGER,
    "direccion" TEXT NOT NULL,
    "esPorDefecto" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "proveedor_direccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cliente_direccion_clienteId_idx" ON "cliente_direccion"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "forma_pago_codigo_key" ON "forma_pago"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "condicion_pago_codigo_key" ON "condicion_pago"("codigo");

-- CreateIndex
CREATE INDEX "condicion_pago_cuota_condicionPagoId_idx" ON "condicion_pago_cuota"("condicionPagoId");

-- CreateIndex
CREATE UNIQUE INDEX "pais_codigo_key" ON "pais"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "region_codigo_key" ON "region"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "provincia_codigo_key" ON "provincia"("codigo");

-- CreateIndex
CREATE INDEX "provincia_regionId_idx" ON "provincia"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "comuna_codigo_key" ON "comuna"("codigo");

-- CreateIndex
CREATE INDEX "comuna_provinciaId_idx" ON "comuna"("provinciaId");

-- CreateIndex
CREATE INDEX "proveedor_direccion_proveedorId_idx" ON "proveedor_direccion"("proveedorId");

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "forma_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_condicionPagoId_fkey" FOREIGN KEY ("condicionPagoId") REFERENCES "condicion_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_direccion" ADD CONSTRAINT "cliente_direccion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_direccion" ADD CONSTRAINT "cliente_direccion_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_direccion" ADD CONSTRAINT "cliente_direccion_comunaId_fkey" FOREIGN KEY ("comunaId") REFERENCES "comuna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicion_pago_cuota" ADD CONSTRAINT "condicion_pago_cuota_condicionPagoId_fkey" FOREIGN KEY ("condicionPagoId") REFERENCES "condicion_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provincia" ADD CONSTRAINT "provincia_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comuna" ADD CONSTRAINT "comuna_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_formaPagoId_fkey" FOREIGN KEY ("formaPagoId") REFERENCES "forma_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_condicionPagoId_fkey" FOREIGN KEY ("condicionPagoId") REFERENCES "condicion_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_direccion" ADD CONSTRAINT "proveedor_direccion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_direccion" ADD CONSTRAINT "proveedor_direccion_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_direccion" ADD CONSTRAINT "proveedor_direccion_comunaId_fkey" FOREIGN KEY ("comunaId") REFERENCES "comuna"("id") ON DELETE SET NULL ON UPDATE CASCADE;
