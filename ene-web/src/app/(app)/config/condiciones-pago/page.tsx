import PageContainer from '@/components/layout/page-container';
import { CondicionPagoListingClient } from '@/features/condiciones-pago/components/condicion-pago-listing-client';
import { CondicionesPagoHeaderActions } from '@/features/condiciones-pago/components/condiciones-pago-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Condiciones de pago | Extremo Norte Expediciones' };

export default function CondicionesPagoPage() {
  return (
    <PageContainer
      pageTitle='Condiciones de pago'
      pageDescription='Cronogramas de cuotas para clientes y proveedores.'
      pageHeaderAction={<CondicionesPagoHeaderActions />}
    >
      <CondicionPagoListingClient />
    </PageContainer>
  );
}
