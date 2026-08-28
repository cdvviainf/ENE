import PageContainer from '@/components/layout/page-container';
import { UsuarioForm } from '@/features/usuarios/components/usuario-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo usuario | Extremo Norte Expediciones' };

export default function NuevoUsuarioPage() {
  return (
    <PageContainer pageTitle='Nuevo usuario' pageDescription='Crea una cuenta de acceso al sistema.'>
      <div className='max-w-3xl'>
        <UsuarioForm />
      </div>
    </PageContainer>
  );
}
