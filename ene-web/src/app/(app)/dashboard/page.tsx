import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard | Extremo Norte Expediciones' };

// Radar de OT (CLAUDE.md §9) — Etapa 11.
export default function DashboardPage() {
  return (
    <Proximamente
      titulo='Dashboard'
      descripcion='El radar de Órdenes de Trabajo con ventanas de aviso se construye en la etapa 11.'
      icon={Icons.dashboard}
    />
  );
}
