import PageContainer from '@/components/layout/page-container';
import { ProveedorForm } from '@/features/proveedores/components/proveedor-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar proveedor | Extremo Norte Expediciones' };

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proveedorId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar proveedor' pageDescription='Ajusta los datos del proveedor, alias, cuentas y contactos.'>
      <div className='max-w-3xl'>
        <ProveedorForm proveedorId={proveedorId} />
      </div>
    </PageContainer>
  );
}
