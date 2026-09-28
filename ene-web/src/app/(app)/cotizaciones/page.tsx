import PageContainer from '@/components/layout/page-container';
import { CotizacionesListingClient } from '@/features/cotizaciones/components/cotizaciones-listing-client';
import { CotizacionesHeaderActions } from '@/features/cotizaciones/components/cotizaciones-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cotizaciones | Extremo Norte Expediciones' };

export default function CotizacionesPage() {
  return (
    <PageContainer
      pageTitle='Cotizaciones'
      pageDescription='Cotizaciones con itinerario por día, versiones y documento bilingüe.'
      pageHeaderAction={<CotizacionesHeaderActions />}
    >
      <CotizacionesListingClient />
    </PageContainer>
  );
}
