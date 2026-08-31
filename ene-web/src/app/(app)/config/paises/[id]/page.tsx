import PageContainer from '@/components/layout/page-container';
import { PaisForm } from '@/features/paises/components/pais-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar país | Extremo Norte Expediciones' };

export default async function EditarPaisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paisId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar país' pageDescription='Ajusta los datos del país.'>
      <div className='max-w-2xl'>
        <PaisForm paisId={paisId} />
      </div>
    </PageContainer>
  );
}
