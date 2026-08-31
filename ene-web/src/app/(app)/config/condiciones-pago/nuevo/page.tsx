import PageContainer from '@/components/layout/page-container';
import { CondicionPagoForm } from '@/features/condiciones-pago/components/condicion-pago-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva condición de pago | Extremo Norte Expediciones' };

export default function NuevaCondicionPagoPage() {
  return (
    <PageContainer pageTitle='Nueva condición de pago' pageDescription='Define el código, nombre y cronograma de cuotas.'>
      <div className='max-w-2xl'>
        <CondicionPagoForm />
      </div>
    </PageContainer>
  );
}
