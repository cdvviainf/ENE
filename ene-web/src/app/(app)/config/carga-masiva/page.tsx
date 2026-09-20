import PageContainer from '@/components/layout/page-container';
import { CargaMasivaClient } from '@/features/carga-masiva/components/carga-masiva-client';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Carga Masiva | Extremo Norte Expediciones' };

export default function CargaMasivaPage() {
  return (
    <PageContainer
      pageTitle='Carga Masiva de Maestros'
      pageDescription='Descarga la plantilla, complétala y cárgala para poblar los maestros de una sola vez.'
    >
      <CargaMasivaClient />
    </PageContainer>
  );
}
