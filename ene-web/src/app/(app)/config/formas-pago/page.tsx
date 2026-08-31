import PageContainer from '@/components/layout/page-container';
import { FormaPagoListingClient } from '@/features/formas-pago/components/forma-pago-listing-client';
import { FormasPagoHeaderActions } from '@/features/formas-pago/components/formas-pago-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Formas de pago | Extremo Norte Expediciones' };

export default function FormasPagoPage() {
  return (
    <PageContainer
      pageTitle='Formas de pago'
      pageDescription='Catálogo de formas de pago compartido entre clientes y proveedores.'
      pageHeaderAction={<FormasPagoHeaderActions />}
    >
      <FormaPagoListingClient />
    </PageContainer>
  );
}
