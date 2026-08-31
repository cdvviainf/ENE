import PageContainer from '@/components/layout/page-container';
import { RegionForm } from '@/features/regiones/components/region-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar región | Extremo Norte Expediciones' };

export default async function EditarRegionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const regionId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar región' pageDescription='Ajusta el código o nombre de la región.'>
      <div className='max-w-2xl'>
        <RegionForm regionId={regionId} />
      </div>
    </PageContainer>
  );
}
