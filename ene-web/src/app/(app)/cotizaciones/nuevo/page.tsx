import PageContainer from '@/components/layout/page-container';
import { CotizacionForm } from '@/features/cotizaciones/components/cotizacion-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nueva cotización | Extremo Norte Expediciones' };

export default function NuevaCotizacionPage() {
  return (
    <PageContainer pageTitle='Nueva cotización' pageDescription='Crea el encabezado; el itinerario se arma después.'>
      <CotizacionForm />
    </PageContainer>
  );
}
