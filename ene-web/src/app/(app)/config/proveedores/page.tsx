import PageContainer from '@/components/layout/page-container';
import { ProveedorListingClient } from '@/features/proveedores/components/proveedor-listing-client';
import { ProveedoresHeaderActions } from '@/features/proveedores/components/proveedores-header-actions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Proveedores | Extremo Norte Expediciones' };

export default function ProveedoresPage() {
  return (
    <PageContainer
      pageTitle='Proveedores'
      pageDescription='El maestro más sensible: de acá dependen la búsqueda al recibir una factura y el pago.'
      pageHeaderAction={<ProveedoresHeaderActions />}
    >
      <ProveedorListingClient />
    </PageContainer>
  );
}
