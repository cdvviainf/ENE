import PageContainer from '@/components/layout/page-container';
import { TarifaVentaDetail } from '@/features/tarifas-venta/components/tarifa-venta-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tarifa de venta | Extremo Norte Expediciones' };

export default async function TarifaVentaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer pageTitle='Tarifa de venta' pageDescription='Detalle de la tarifa, sus valores y las demás tarifas del servicio.'>
      <div className='max-w-3xl'>
        <TarifaVentaDetail tarifaId={Number.parseInt(id, 10)} />
      </div>
    </PageContainer>
  );
}
