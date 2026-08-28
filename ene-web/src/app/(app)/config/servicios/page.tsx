import PageContainer from '@/components/layout/page-container';
import { ServicioListingClient } from '@/features/servicios/components/servicio-listing-client';
import { ServiciosHeaderActions } from '@/features/servicios/components/servicios-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Servicios | Extremo Norte Expediciones' };

export default function ServiciosPage() {
  return (
    <PageContainer
      pageTitle='Servicios'
      pageDescription='Catálogo de costos. El precio de venta se calcula al cotizar.'
      pageHeaderAction={<ServiciosHeaderActions />}
    >
      <ServicioListingClient />
    </PageContainer>
  );
}
