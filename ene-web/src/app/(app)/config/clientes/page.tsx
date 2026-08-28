import PageContainer from '@/components/layout/page-container';
import { ClienteListingClient } from '@/features/clientes/components/cliente-listing-client';
import { ClientesHeaderActions } from '@/features/clientes/components/clientes-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Clientes | Extremo Norte Expediciones' };

export default function ClientesPage() {
  return (
    <PageContainer
      pageTitle='Clientes'
      pageDescription='Agencias de viajes (receptivo) y empresas (eventos) que contratan operaciones.'
      pageHeaderAction={<ClientesHeaderActions />}
    >
      <ClienteListingClient />
    </PageContainer>
  );
}
