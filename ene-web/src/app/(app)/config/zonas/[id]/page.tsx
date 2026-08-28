import PageContainer from '@/components/layout/page-container';
import { ZonaForm } from '@/features/zonas/components/zona-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar zona | Extremo Norte Expediciones' };

export default async function EditarZonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zonaId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar zona' pageDescription='Ajusta el nombre de la zona.'>
      <div className='max-w-2xl'>
        <ZonaForm zonaId={zonaId} />
      </div>
    </PageContainer>
  );
}
