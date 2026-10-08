import PageContainer from '@/components/layout/page-container';
import { TipoDocumentoListingClient } from '@/features/tipos-documento/components/tipo-documento-listing-client';
import { TiposDocumentoHeaderActions } from '@/features/tipos-documento/components/tipos-documento-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tipos de documento | Extremo Norte Expediciones' };

export default function TiposDocumentoPage() {
  return (
    <PageContainer
      pageTitle='Tipos de documento'
      pageDescription='Catálogo de documentos tributarios que emiten los proveedores, con su forma de cálculo.'
      pageHeaderAction={<TiposDocumentoHeaderActions />}
    >
      <TipoDocumentoListingClient />
    </PageContainer>
  );
}
