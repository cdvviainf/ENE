import PageContainer from '@/components/layout/page-container';
import { ComunaForm } from '@/features/comunas/components/comuna-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva comuna | Extremo Norte Expediciones' };

export default function NuevaComunaPage() {
  return (
    <PageContainer pageTitle='Nueva comuna' pageDescription='Agrega una comuna a la geografía chilena.'>
      <div className='max-w-2xl'>
        <ComunaForm />
      </div>
    </PageContainer>
  );
}
