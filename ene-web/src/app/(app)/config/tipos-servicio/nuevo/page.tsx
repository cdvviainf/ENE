import PageContainer from '@/components/layout/page-container';
import { TipoServicioForm } from '@/features/tipos-servicio/components/tipo-servicio-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo tipo de servicio | Extremo Norte Expediciones' };

export default function NuevoTipoServicioPage() {
  return (
    <PageContainer pageTitle='Nuevo tipo de servicio' pageDescription='Crea una nueva clasificación de servicio.'>
      <div className='max-w-2xl'>
        <TipoServicioForm />
      </div>
    </PageContainer>
  );
}
