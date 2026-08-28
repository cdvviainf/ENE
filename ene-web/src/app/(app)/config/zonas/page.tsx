import PageContainer from '@/components/layout/page-container';
import { ZonaListingClient } from '@/features/zonas/components/zona-listing-client';
import { ZonasHeaderActions } from '@/features/zonas/components/zonas-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Zonas | Extremo Norte Expediciones' };

export default function ZonasPage() {
  return (
    <PageContainer
      pageTitle='Zonas'
      pageDescription='Territorios de operación que agrupan servicios, proveedores y reportes.'
      pageHeaderAction={<ZonasHeaderActions />}
    >
      <ZonaListingClient />
    </PageContainer>
  );
}
