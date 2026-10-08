import PageContainer from '@/components/layout/page-container';
import { TipoDocumentoForm } from '@/features/tipos-documento/components/tipo-documento-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo tipo de documento | Extremo Norte Expediciones' };

export default function NuevoTipoDocumentoPage() {
  return (
    <PageContainer pageTitle='Nuevo tipo de documento' pageDescription='Crea un nuevo tipo de documento.'>
      <div className='max-w-2xl'>
        <TipoDocumentoForm />
      </div>
    </PageContainer>
  );
}
