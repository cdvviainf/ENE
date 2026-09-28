import PageContainer from '@/components/layout/page-container';
import { CotizacionDetail } from '@/features/cotizaciones/components/cotizacion-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cotización | Extremo Norte Expediciones' };

export default async function CotizacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer pageTitle='Cotización' pageDescription='Itinerario, versiones y documento.'>
      <CotizacionDetail cotizacionId={Number(id)} />
    </PageContainer>
  );
}
