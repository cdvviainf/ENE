import PageContainer from '@/components/layout/page-container';
import { UsuarioListingClient } from '@/features/usuarios/components/usuario-listing-client';
import { UsuariosHeaderActions } from '@/features/usuarios/components/usuarios-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Usuarios | Extremo Norte Expediciones' };

export default function UsuariosPage() {
  return (
    <PageContainer
      pageTitle='Usuarios'
      pageDescription='Cuentas de acceso al sistema y su perfil asignado.'
      pageHeaderAction={<UsuariosHeaderActions />}
    >
      <UsuarioListingClient />
    </PageContainer>
  );
}
