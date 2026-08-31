import PageContainer from '@/components/layout/page-container';
import { PaisForm } from '@/features/paises/components/pais-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo país | Extremo Norte Expediciones' };

export default function NuevoPaisPage() {
  return (
    <PageContainer pageTitle='Nuevo país' pageDescription='Crea un nuevo país.'>
      <div className='max-w-2xl'>
        <PaisForm />
      </div>
    </PageContainer>
  );
}
