import PageContainer from '@/components/layout/page-container';
import { EmpresaForm } from '@/features/empresa/components/empresa-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Datos de empresa | Extremo Norte Expediciones' };

export default function EmpresaPage() {
  return (
    <PageContainer
      pageTitle='Datos de empresa'
      pageDescription='Identidad de Extremo Norte Expediciones usada en los documentos emitidos.'
    >
      <div className='max-w-3xl'>
        <EmpresaForm />
      </div>
    </PageContainer>
  );
}
