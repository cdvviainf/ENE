import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cotizaciones | Extremo Norte Expediciones' };

// Itinerario, versiones y PDF bilingüe (CLAUDE.md §12) — Etapa 7.
export default function CotizacionesPage() {
  return (
    <Proximamente
      titulo='Cotizaciones'
      descripcion='El módulo de cotizaciones con itinerario y versiones se construye en la etapa 7.'
      icon={Icons.cotizaciones}
    />
  );
}
