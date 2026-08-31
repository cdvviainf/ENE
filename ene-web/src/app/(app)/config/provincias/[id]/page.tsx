import PageContainer from '@/components/layout/page-container';
import { ProvinciaForm } from '@/features/provincias/components/provincia-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar provincia | Extremo Norte Expediciones' };

export default async function EditarProvinciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provinciaId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar provincia' pageDescription='Ajusta el código, nombre o región de la provincia.'>
      <div className='max-w-2xl'>
        <ProvinciaForm provinciaId={provinciaId} />
      </div>
    </PageContainer>
  );
}
