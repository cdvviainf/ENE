import PageContainer from '@/components/layout/page-container';
import { NegocioForm } from '@/features/negocios/components/negocio-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo negocio | Extremo Norte Expediciones' };

export default function NuevoNegocioPage() {
  return (
    <PageContainer pageTitle='Nuevo negocio' pageDescription='Crea un nuevo negocio de pasajeros.'>
      <div className='max-w-3xl'>
        <NegocioForm />
      </div>
    </PageContainer>
  );
}
