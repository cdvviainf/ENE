import PageContainer from '@/components/layout/page-container';
import { PerfilForm } from '@/features/perfiles/components/perfil-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nuevo perfil | Extremo Norte Expediciones' };

export default function NuevoPerfilPage() {
  return (
    <PageContainer pageTitle='Nuevo perfil' pageDescription='Define el código, nombre y accesos del perfil.'>
      <div className='max-w-4xl'>
        <PerfilForm />
      </div>
    </PageContainer>
  );
}
