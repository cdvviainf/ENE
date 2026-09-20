import PageContainer from '@/components/layout/page-container';
import { TarifarioDetail } from '@/features/tarifas/components/tarifario-detail';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tarifario | Extremo Norte Expediciones' };

export default async function TarifarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarifarioId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Tarifario' pageDescription='Detalle del tarifario y sus valores.'>
      <div className='max-w-3xl'>
        <TarifarioDetail tarifarioId={tarifarioId} />
      </div>
    </PageContainer>
  );
}
