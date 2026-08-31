import PageContainer from '@/components/layout/page-container';
import { PaisListingClient } from '@/features/paises/components/pais-listing-client';
import { PaisesHeaderActions } from '@/features/paises/components/paises-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Países | Extremo Norte Expediciones' };

export default function PaisesPage() {
  return (
    <PageContainer
      pageTitle='Países'
      pageDescription='Países disponibles para direcciones de clientes y proveedores.'
      pageHeaderAction={<PaisesHeaderActions />}
    >
      <PaisListingClient />
    </PageContainer>
  );
}
