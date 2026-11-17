import PageContainer from '@/components/layout/page-container';
import { ServiciosTarifaListingClient } from '@/features/tarifas-venta/components/servicios-tarifa-listing-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tarifas de venta | Extremo Norte Expediciones' };

export default function TarifasVentaPage() {
  return (
    <PageContainer
      pageTitle='Tarifas de venta'
      pageDescription='Todos los servicios con su tarifa de venta: estado, vigencia por moneda y acción para agregarla.'
    >
      <ServiciosTarifaListingClient />
    </PageContainer>
  );
}
