import PageContainer from '@/components/layout/page-container';
import { GrupoListingClient } from '@/features/grupos/components/grupo-listing-client';
import { GruposHeaderActions } from '@/features/grupos/components/grupos-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Grupos | Extremo Norte Expediciones' };

export default function GruposPage() {
  return (
    <PageContainer
      pageTitle='Grupos'
      pageDescription='Los pasajeros que viajan. El cliente contrata, el grupo viaja.'
      pageHeaderAction={<GruposHeaderActions />}
    >
      <GrupoListingClient />
    </PageContainer>
  );
}
