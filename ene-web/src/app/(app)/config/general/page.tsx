import PageContainer from '@/components/layout/page-container';
import { ConfiguracionGeneralTabs } from '@/features/configuracion-general/components/configuracion-general-tabs';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Configuración general | Extremo Norte Expediciones' };

export default function ConfiguracionGeneralPage() {
  return (
    <PageContainer
      pageTitle='Configuración general'
      pageDescription='Datos de la empresa emisora, logo de los documentos y tasas tributarias.'
    >
      <div className='max-w-3xl'>
        <ConfiguracionGeneralTabs />
      </div>
    </PageContainer>
  );
}
