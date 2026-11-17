import PageContainer from '@/components/layout/page-container';
import { TarifaVentaForm } from '@/features/tarifas-venta/components/tarifa-venta-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar tarifa de venta | Extremo Norte Expediciones' };

export default async function EditarTarifaVentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer
      pageTitle='Editar tarifa de venta'
      pageDescription='Corrige valores y vigencia sin crear versión. Las OT ya creadas no cambian: la venta queda copiada en cada línea.'
    >
      <div className='max-w-3xl'>
        <TarifaVentaForm mode={{ kind: 'editar', tarifaId: Number.parseInt(id, 10) }} />
      </div>
    </PageContainer>
  );
}
