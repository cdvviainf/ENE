import PageContainer from '@/components/layout/page-container';
import { ComunaListingClient } from '@/features/comunas/components/comuna-listing-client';
import { ComunasHeaderActions } from '@/features/comunas/components/comunas-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Comunas | Extremo Norte Expediciones' };

export default function ComunasPage() {
  return (
    <PageContainer
      pageTitle='Comunas'
      pageDescription='Geografía chilena para las direcciones de clientes y proveedores.'
      pageHeaderAction={<ComunasHeaderActions />}
    >
      <ComunaListingClient />
    </PageContainer>
  );
}
