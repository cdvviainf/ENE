import PageContainer from '@/components/layout/page-container';
import { TarifarioForm } from '@/features/tarifas/components/tarifario-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar tarifario | Extremo Norte Expediciones' };

export default async function EditarTarifarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarifarioId = Number.parseInt(id, 10);

  return (
    <PageContainer
      pageTitle='Editar tarifario'
      pageDescription='Edita los valores y la vigencia. La tarifa queda congelada en las cotizaciones existentes; para refrescar una cotización usa "Recalcular costo".'
    >
      <div className='max-w-3xl'>
        <TarifarioForm mode={{ kind: 'editar', tarifarioId }} />
      </div>
    </PageContainer>
  );
}
