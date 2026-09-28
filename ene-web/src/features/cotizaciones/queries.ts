import { queryOptions } from '@tanstack/react-query';
import { cotizacionesService } from './service';
import type { EstadoCotizacion } from './types';

export const cotizacionesKeys = {
  all: ['cotizaciones'] as const,
  list: (filters: object) => ['cotizaciones', 'list', filters] as const,
  detail: (id: number) => ['cotizaciones', 'detail', id] as const,
  versiones: (id: number) => ['cotizaciones', 'versiones', id] as const
};

export function cotizacionesListOptions(
  filters: { page?: number; limit?: number; estado?: EstadoCotizacion; clienteId?: number; q?: string } = {}
) {
  return queryOptions({
    queryKey: cotizacionesKeys.list(filters),
    queryFn: () => cotizacionesService.list(filters),
    staleTime: 30_000
  });
}

export function cotizacionDetailOptions(id: number) {
  return queryOptions({
    queryKey: cotizacionesKeys.detail(id),
    queryFn: () => cotizacionesService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}

export function cotizacionVersionesOptions(id: number) {
  return queryOptions({
    queryKey: cotizacionesKeys.versiones(id),
    queryFn: () => cotizacionesService.listVersiones(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
