import PageContainer from '@/components/layout/page-container';
import { ClienteForm } from '@/features/clientes/components/cliente-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo cliente | Extremo Norte Expediciones' };

export default function NuevoClientePage() {
  return (
    <PageContainer pageTitle='Nuevo cliente' pageDescription='Crea una nueva agencia o empresa cliente.'>
      <div className='max-w-3xl'>
        <ClienteForm />
      </div>
    </PageContainer>
  );
}
