import PageContainer from '@/components/layout/page-container';
import { ProvinciaForm } from '@/features/provincias/components/provincia-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva provincia | Extremo Norte Expediciones' };

export default function NuevaProvinciaPage() {
  return (
    <PageContainer pageTitle='Nueva provincia' pageDescription='Crea una nueva provincia.'>
      <div className='max-w-2xl'>
        <ProvinciaForm />
      </div>
    </PageContainer>
  );
}
