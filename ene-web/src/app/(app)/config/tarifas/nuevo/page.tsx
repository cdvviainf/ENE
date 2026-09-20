import PageContainer from '@/components/layout/page-container';
import { TarifarioForm } from '@/features/tarifas/components/tarifario-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo tarifario | Extremo Norte Expediciones' };

export default function NuevoTarifarioPage() {
  return (
    <PageContainer pageTitle='Nuevo tarifario' pageDescription='Crea un tarifario nuevo para un proveedor y servicio.'>
      <div className='max-w-3xl'>
        <TarifarioForm mode={{ kind: 'nuevo' }} />
      </div>
    </PageContainer>
  );
}
