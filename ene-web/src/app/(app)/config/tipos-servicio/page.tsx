import PageContainer from '@/components/layout/page-container';
import { TipoServicioListingClient } from '@/features/tipos-servicio/components/tipo-servicio-listing-client';
import { TiposServicioHeaderActions } from '@/features/tipos-servicio/components/tipos-servicio-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tipos de servicio | Extremo Norte Expediciones' };

export default function TiposServicioPage() {
  return (
    <PageContainer
      pageTitle='Tipos de servicio'
      pageDescription='Clasifica servicios y proveedores, y define el modelo de tarifa y ventana de aviso por defecto.'
      pageHeaderAction={<TiposServicioHeaderActions />}
    >
      <TipoServicioListingClient />
    </PageContainer>
  );
}
