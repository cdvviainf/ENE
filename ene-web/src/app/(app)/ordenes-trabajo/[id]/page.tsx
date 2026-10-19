import PageContainer from '@/components/layout/page-container';
import { OrdenTrabajoDetail } from '@/features/ordenes-trabajo/components/orden-trabajo-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Orden de Trabajo | Extremo Norte Expediciones' };

export default async function OrdenTrabajoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer pageTitle='Orden de Trabajo' pageDescription='Itinerario, versiones, estado operativo y adjuntos.'>
      <OrdenTrabajoDetail ordenId={Number(id)} />
    </PageContainer>
  );
}
