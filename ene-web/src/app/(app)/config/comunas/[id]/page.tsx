import PageContainer from '@/components/layout/page-container';
import { ComunaForm } from '@/features/comunas/components/comuna-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar comuna | Extremo Norte Expediciones' };

export default async function EditarComunaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comunaId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar comuna' pageDescription='Ajusta el nombre o la provincia de la comuna.'>
      <div className='max-w-2xl'>
        <ComunaForm comunaId={comunaId} />
      </div>
    </PageContainer>
  );
}
