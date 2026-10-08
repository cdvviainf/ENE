import PageContainer from '@/components/layout/page-container';
import { TipoDocumentoForm } from '@/features/tipos-documento/components/tipo-documento-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar tipo de documento | Extremo Norte Expediciones' };

export default async function EditarTipoDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tipoDocumentoId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar tipo de documento' pageDescription='Ajusta los datos del tipo de documento.'>
      <div className='max-w-2xl'>
        <TipoDocumentoForm tipoDocumentoId={tipoDocumentoId} />
      </div>
    </PageContainer>
  );
}
