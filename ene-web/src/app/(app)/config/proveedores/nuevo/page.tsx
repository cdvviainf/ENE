import PageContainer from '@/components/layout/page-container';
import { ProveedorForm } from '@/features/proveedores/components/proveedor-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo proveedor | Extremo Norte Expediciones' };

export default function NuevoProveedorPage() {
  return (
    <PageContainer pageTitle='Nuevo proveedor' pageDescription='Crea un nuevo proveedor de servicios.'>
      <div className='max-w-3xl'>
        <ProveedorForm />
      </div>
    </PageContainer>
  );
}
