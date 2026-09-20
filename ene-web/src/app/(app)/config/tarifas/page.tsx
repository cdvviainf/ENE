import PageContainer from '@/components/layout/page-container';
import { TarifarioListingClient } from '@/features/tarifas/components/tarifario-listing-client';
import { TarifariosHeaderActions } from '@/features/tarifas/components/tarifarios-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tarifas | Extremo Norte Expediciones' };

export default function TarifasPage() {
  return (
    <PageContainer
      pageTitle='Tarifas'
      pageDescription='Tarifarios de proveedores por servicio, con sus versiones y vigencias.'
      pageHeaderAction={<TarifariosHeaderActions />}
    >
      <TarifarioListingClient />
    </PageContainer>
  );
}
