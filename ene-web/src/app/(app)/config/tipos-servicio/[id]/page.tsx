import PageContainer from '@/components/layout/page-container';
import { TipoServicioForm } from '@/features/tipos-servicio/components/tipo-servicio-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar tipo de servicio | Extremo Norte Expediciones' };

export default async function EditarTipoServicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tipoServicioId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar tipo de servicio' pageDescription='Ajusta el modelo de tarifa y la ventana de aviso.'>
      <div className='max-w-2xl'>
        <TipoServicioForm tipoServicioId={tipoServicioId} />
      </div>
    </PageContainer>
  );
}
