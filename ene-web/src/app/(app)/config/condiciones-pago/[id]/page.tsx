import PageContainer from '@/components/layout/page-container';
import { CondicionPagoForm } from '@/features/condiciones-pago/components/condicion-pago-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar condición de pago | Extremo Norte Expediciones' };

export default async function EditarCondicionPagoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const condicionPagoId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar condición de pago' pageDescription='Ajusta el nombre y el cronograma de cuotas.'>
      <div className='max-w-2xl'>
        <CondicionPagoForm condicionPagoId={condicionPagoId} />
      </div>
    </PageContainer>
  );
}
