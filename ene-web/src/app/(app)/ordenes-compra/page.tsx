import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Órdenes de Compra | Extremo Norte Expediciones' };

// Emisión, validación de correspondencia y costo real — Etapa 9.
export default function OrdenesCompraPage() {
  return (
    <Proximamente
      titulo='Órdenes de Compra'
      descripcion='El módulo de Órdenes de Compra se construye en la etapa 9.'
      icon={Icons.ordenesCompra}
    />
  );
}
