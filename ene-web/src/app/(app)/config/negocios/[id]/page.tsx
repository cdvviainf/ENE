import PageContainer from '@/components/layout/page-container';
import { NegocioForm } from '@/features/negocios/components/negocio-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar negocio | Extremo Norte Expediciones' };

export default async function EditarNegocioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const negocioId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar negocio' pageDescription='Ajusta los datos del negocio y sus pasajeros.'>
      <div className='max-w-3xl'>
        <NegocioForm negocioId={negocioId} />
      </div>
    </PageContainer>
  );
}
