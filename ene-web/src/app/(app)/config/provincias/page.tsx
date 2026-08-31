import PageContainer from '@/components/layout/page-container';
import { ProvinciaListingClient } from '@/features/provincias/components/provincia-listing-client';
import { ProvinciasHeaderActions } from '@/features/provincias/components/provincias-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Provincias | Extremo Norte Expediciones' };

export default function ProvinciasPage() {
  return (
    <PageContainer
      pageTitle='Provincias'
      pageDescription='Divisiones administrativas dentro de cada región, usadas en direcciones.'
      pageHeaderAction={<ProvinciasHeaderActions />}
    >
      <ProvinciaListingClient />
    </PageContainer>
  );
}
