import PageContainer from '@/components/layout/page-container';
import { UsuarioForm } from '@/features/usuarios/components/usuario-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar usuario | Extremo Norte Expediciones' };

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuarioId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar usuario' pageDescription='Ajusta el nombre, perfil y estado del usuario.'>
      <div className='max-w-3xl'>
        <UsuarioForm usuarioId={usuarioId} />
      </div>
    </PageContainer>
  );
}
