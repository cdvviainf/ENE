import PageContainer from '@/components/layout/page-container';
import { ServicioForm } from '@/features/servicios/components/servicio-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Editar servicio | Extremo Norte Expediciones' };

export default async function EditarServicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const servicioId = Number.parseInt(id, 10);

  return (
    <PageContainer pageTitle='Editar servicio' pageDescription='Ajusta los datos del servicio.'>
      <div className='max-w-3xl'>
        <ServicioForm servicioId={servicioId} />
      </div>
    </PageContainer>
  );
}
