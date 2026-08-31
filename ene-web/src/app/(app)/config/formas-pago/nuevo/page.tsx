import PageContainer from '@/components/layout/page-container';
import { FormaPagoForm } from '@/features/formas-pago/components/forma-pago-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva forma de pago | Extremo Norte Expediciones' };

export default function NuevaFormaPagoPage() {
  return (
    <PageContainer pageTitle='Nueva forma de pago' pageDescription='Crea una nueva forma de pago.'>
      <div className='max-w-2xl'>
        <FormaPagoForm />
      </div>
    </PageContainer>
  );
}
