import PageContainer from '@/components/layout/page-container';
import { RegionForm } from '@/features/regiones/components/region-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva región | Extremo Norte Expediciones' };

export default function NuevaRegionPage() {
  return (
    <PageContainer pageTitle='Nueva región' pageDescription='Crea una nueva región.'>
      <div className='max-w-2xl'>
        <RegionForm />
      </div>
    </PageContainer>
  );
}
