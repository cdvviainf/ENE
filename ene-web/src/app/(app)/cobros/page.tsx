import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cobros y pagos | Extremo Norte Expediciones' };

// Cuenta corriente de cliente y pagos a proveedor — Etapa 10.
export default function CobrosPage() {
  return (
    <Proximamente
      titulo='Cobros y pagos'
      descripcion='El módulo de cobros y pagos se construye en la etapa 10.'
      icon={Icons.cobros}
    />
  );
}
