import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mantenedores | Extremo Norte Expediciones' };

// Clientes, ejecutivos, grupos, proveedores, servicios, zonas — Etapa 4.
export default function ConfigPage() {
  return (
    <Proximamente
      titulo='Mantenedores'
      descripcion='Los mantenedores generales (clientes, proveedores, servicios, zonas) se construyen en la etapa 4.'
      icon={Icons.settings}
    />
  );
}
