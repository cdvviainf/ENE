import PageContainer from '@/components/layout/page-container';
import { OrdenTrabajoForm } from '@/features/ordenes-trabajo/components/orden-trabajo-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva orden de trabajo | Extremo Norte Expediciones' };

export default function NuevaOrdenTrabajoPage() {
  return (
    <PageContainer
      pageTitle='Nueva orden de trabajo'
      pageDescription='Crea una OT directa (sin cotización), digitando la cabecera y el itinerario. El costo de cada servicio se precarga del tarifario vigente (RN-OT-01).'
    >
      <div className='max-w-4xl'>
        <OrdenTrabajoForm />
      </div>
    </PageContainer>
  );
}
