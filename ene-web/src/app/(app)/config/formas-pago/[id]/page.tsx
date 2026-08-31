import PageContainer from '@/components/layout/page-container';
import { FormaPagoForm } from '@/features/formas-pago/components/forma-pago-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar forma de pago | Extremo Norte Expediciones' };

export default async function EditarFormaPagoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formaPagoId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar forma de pago' pageDescription='Ajusta los datos de la forma de pago.'>
      <div className='max-w-2xl'>
        <FormaPagoForm formaPagoId={formaPagoId} />
      </div>
    </PageContainer>
  );
}
