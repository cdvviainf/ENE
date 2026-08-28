import PageContainer from '@/components/layout/page-container';
import { GrupoForm } from '@/features/grupos/components/grupo-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar grupo | Extremo Norte Expediciones' };

export default async function EditarGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const grupoId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar grupo' pageDescription='Ajusta los datos del grupo y sus pasajeros.'>
      <div className='max-w-3xl'>
        <GrupoForm grupoId={grupoId} />
      </div>
    </PageContainer>
  );
}
