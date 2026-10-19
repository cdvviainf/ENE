import PageContainer from '@/components/layout/page-container';
import { OrdenesTrabajoListingClient } from '@/features/ordenes-trabajo/components/ordenes-trabajo-listing-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Órdenes de Trabajo | Extremo Norte Expediciones' };

export default function OrdenesTrabajoPage() {
  return (
    <PageContainer
      pageTitle='Órdenes de Trabajo'
      pageDescription='OT generadas desde cotizaciones aprobadas: itinerario, versiones y adjuntos.'
    >
      <OrdenesTrabajoListingClient />
    </PageContainer>
  );
}
