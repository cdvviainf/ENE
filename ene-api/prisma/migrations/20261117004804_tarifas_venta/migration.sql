-- CreateTable
CREATE TABLE "tarifa_venta" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3),
    "actualizadoPor" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,

    CONSTRAINT "tarifa_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifa_venta_valor" (
    "id" SERIAL NOT NULL,
    "tarifaVentaId" INTEGER NOT NULL,
    "modelo" "ModeloTarifa" NOT NULL,
    "paxDesde" INTEGER,
    "paxHasta" INTEGER,
    "acomodacion" "Acomodacion",
    "valor" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "tarifa_venta_valor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarifa_venta_servicioId_moneda_vigenciaDesde_idx" ON "tarifa_venta"("servicioId", "moneda", "vigenciaDesde");

-- CreateIndex
CREATE INDEX "tarifa_venta_valor_tarifaVentaId_idx" ON "tarifa_venta_valor"("tarifaVentaId");

-- AddForeignKey
ALTER TABLE "tarifa_venta" ADD CONSTRAINT "tarifa_venta_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifa_venta_valor" ADD CONSTRAINT "tarifa_venta_valor_tarifaVentaId_fkey" FOREIGN KEY ("tarifaVentaId") REFERENCES "tarifa_venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
