import PageContainer from '@/components/layout/page-container';
import { ClienteForm } from '@/features/clientes/components/cliente-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar cliente | Extremo Norte Expediciones' };

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clienteId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar cliente' pageDescription='Ajusta los datos del cliente y sus ejecutivos.'>
      <div className='max-w-3xl'>
        <ClienteForm clienteId={clienteId} />
      </div>
    </PageContainer>
  );
}
