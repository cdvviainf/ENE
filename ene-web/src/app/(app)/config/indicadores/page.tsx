import PageContainer from '@/components/layout/page-container';
import { IndicadoresForm } from '@/features/indicadores/components/indicadores-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Indicadores | Extremo Norte Expediciones' };

export default function IndicadoresPage() {
  return (
    <PageContainer
      pageTitle='Indicadores'
      pageDescription='Tasas de IVA y retención de boleta de honorarios usadas en el desglose referencial de costos (RN-IMP-01).'
    >
      <div className='max-w-xl'>
        <IndicadoresForm />
      </div>
    </PageContainer>
  );
}
