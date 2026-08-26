import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Órdenes de Trabajo | Extremo Norte Expediciones' };

// Conversión desde cotización, línea base y adjuntos — Etapa 8.
export default function OrdenesTrabajoPage() {
  return (
    <Proximamente
      titulo='Órdenes de Trabajo'
      descripcion='El módulo de Órdenes de Trabajo se construye en la etapa 8.'
      icon={Icons.ordenesTrabajo}
    />
  );
}
