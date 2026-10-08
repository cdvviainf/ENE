import PageContainer from '@/components/layout/page-container';
import { NegocioListingClient } from '@/features/negocios/components/negocio-listing-client';
import { NegociosHeaderActions } from '@/features/negocios/components/negocios-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Negocios | Extremo Norte Expediciones' };

export default function NegociosPage() {
  return (
    <PageContainer
      pageTitle='Negocios'
      pageDescription='Los pasajeros que viajan. El cliente contrata, el negocio viaja.'
      pageHeaderAction={<NegociosHeaderActions />}
    >
      <NegocioListingClient />
    </PageContainer>
  );
}
