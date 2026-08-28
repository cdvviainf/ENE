import PageContainer from '@/components/layout/page-container';
import { ServicioForm } from '@/features/servicios/components/servicio-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo servicio | Extremo Norte Expediciones' };

export default function NuevoServicioPage() {
  return (
    <PageContainer pageTitle='Nuevo servicio' pageDescription='Crea un nuevo servicio del catálogo de costos.'>
      <div className='max-w-3xl'>
        <ServicioForm />
      </div>
    </PageContainer>
  );
}
