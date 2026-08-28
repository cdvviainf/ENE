import PageContainer from '@/components/layout/page-container';
import { GrupoForm } from '@/features/grupos/components/grupo-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo grupo | Extremo Norte Expediciones' };

export default function NuevoGrupoPage() {
  return (
    <PageContainer pageTitle='Nuevo grupo' pageDescription='Crea un nuevo grupo de pasajeros.'>
      <div className='max-w-3xl'>
        <GrupoForm />
      </div>
    </PageContainer>
  );
}
