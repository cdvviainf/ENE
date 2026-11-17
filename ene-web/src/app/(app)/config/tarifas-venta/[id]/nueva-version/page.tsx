import PageContainer from '@/components/layout/page-container';
import { TarifaVentaForm } from '@/features/tarifas-venta/components/tarifa-venta-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva versión de tarifa de venta | Extremo Norte Expediciones' };

export default async function NuevaVersionTarifaVentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer
      pageTitle='Nueva versión de tarifa de venta'
      pageDescription='Crea una versión nueva con su propia vigencia; la actual queda como historial.'
    >
      <div className='max-w-3xl'>
        <TarifaVentaForm mode={{ kind: 'nueva-version', tarifaId: Number.parseInt(id, 10) }} />
      </div>
    </PageContainer>
  );
}
