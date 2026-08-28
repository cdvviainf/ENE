import PageContainer from '@/components/layout/page-container';
import { PerfilListingClient } from '@/features/perfiles/components/perfil-listing-client';
import { PerfilesHeaderActions } from '@/features/perfiles/components/perfiles-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Perfiles | Extremo Norte Expediciones' };

export default function PerfilesPage() {
  return (
    <PageContainer
      pageTitle='Perfiles'
      pageDescription='Perfiles de acceso y su matriz de permisos por ítem de menú.'
      pageHeaderAction={<PerfilesHeaderActions />}
    >
      <PerfilListingClient />
    </PageContainer>
  );
}
