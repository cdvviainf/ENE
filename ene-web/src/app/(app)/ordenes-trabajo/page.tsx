import PageContainer from '@/components/layout/page-container';
import { OrdenesTrabajoListingClient } from '@/features/ordenes-trabajo/components/ordenes-trabajo-listing-client';
import { OrdenesTrabajoHeaderActions } from '@/features/ordenes-trabajo/components/ordenes-trabajo-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Órdenes de Trabajo | Extremo Norte Expediciones' };

export default function OrdenesTrabajoPage() {
  return (
    <PageContainer
      pageTitle='Órdenes de Trabajo'
      pageDescription='OT generadas desde cotizaciones aprobadas o creadas directamente: itinerario, versiones y adjuntos.'
      pageHeaderAction={<OrdenesTrabajoHeaderActions />}
    >
      <OrdenesTrabajoListingClient />
    </PageContainer>
  );
}
