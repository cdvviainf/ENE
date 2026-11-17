import PageContainer from '@/components/layout/page-container';
import { TarifaVentaForm } from '@/features/tarifas-venta/components/tarifa-venta-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva tarifa de venta | Extremo Norte Expediciones' };

export default async function NuevaTarifaVentaPage({ searchParams }: { searchParams: Promise<{ servicioId?: string }> }) {
  const { servicioId } = await searchParams;
  const id = servicioId ? Number.parseInt(servicioId, 10) : NaN;

  return (
    <PageContainer pageTitle='Nueva tarifa de venta' pageDescription='Define el precio de venta del servicio, su moneda y vigencia.'>
      <div className='max-w-3xl'>
        <TarifaVentaForm mode={{ kind: 'nuevo', ...(Number.isFinite(id) && id > 0 ? { servicioId: id } : {}) }} />
      </div>
    </PageContainer>
  );
}
