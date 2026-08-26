import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Facturación | Extremo Norte Expediciones' };

// DTE, cuenta corriente y pagos a proveedores — Etapa 10.
export default function FacturacionPage() {
  return (
    <Proximamente
      titulo='Facturación'
      descripcion='El módulo de facturación (DTE) se construye en la etapa 10.'
      icon={Icons.facturacion}
    />
  );
}
