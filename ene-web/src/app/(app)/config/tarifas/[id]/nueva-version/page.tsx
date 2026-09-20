import PageContainer from '@/components/layout/page-container';
import { TarifarioForm } from '@/features/tarifas/components/tarifario-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva versión de tarifario | Extremo Norte Expediciones' };

export default async function NuevaVersionTarifarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarifarioId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Nueva versión' pageDescription='Crea una nueva versión de este tarifario (RN-TAR-06).'>
      <div className='max-w-3xl'>
        <TarifarioForm mode={{ kind: 'nueva-version', tarifarioId }} />
      </div>
    </PageContainer>
  );
}
