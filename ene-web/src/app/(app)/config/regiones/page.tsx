import PageContainer from '@/components/layout/page-container';
import { RegionListingClient } from '@/features/regiones/components/region-listing-client';
import { RegionesHeaderActions } from '@/features/regiones/components/regiones-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Regiones | Extremo Norte Expediciones' };

export default function RegionesPage() {
  return (
    <PageContainer
      pageTitle='Regiones'
      pageDescription='Divisiones administrativas de primer nivel usadas en direcciones y zonas.'
      pageHeaderAction={<RegionesHeaderActions />}
    >
      <RegionListingClient />
    </PageContainer>
  );
}
