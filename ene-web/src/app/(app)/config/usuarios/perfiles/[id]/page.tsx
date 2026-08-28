import PageContainer from '@/components/layout/page-container';
import { PerfilForm } from '@/features/perfiles/components/perfil-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar perfil | Extremo Norte Expediciones' };

export default async function EditarPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfilId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar perfil' pageDescription='Ajusta el nombre, descripción y accesos del perfil.'>
      <div className='max-w-4xl'>
        <PerfilForm perfilId={perfilId} />
      </div>
    </PageContainer>
  );
}
