import PageContainer from '@/components/layout/page-container';
import { ZonaForm } from '@/features/zonas/components/zona-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva zona | Extremo Norte Expediciones' };

export default function NuevaZonaPage() {
  return (
    <PageContainer pageTitle='Nueva zona' pageDescription='Crea un nuevo territorio de operación.'>
      <div className='max-w-2xl'>
        <ZonaForm />
      </div>
    </PageContainer>
  );
}
