import { queryOptions } from '@tanstack/react-query';
import { tiposServicioService } from './service';

export const tiposServicioKeys = {
  all: ['tipos-servicio'] as const,
  list: (filters: object) => ['tipos-servicio', 'list', filters] as const,
  detail: (id: number) => ['tipos-servicio', 'detail', id] as const
};

export function tiposServicioListOptions(filters: { page?: number; limit?: number; q?: string } = {}) {
  return queryOptions({
    queryKey: tiposServicioKeys.list(filters),
    queryFn: () => tiposServicioService.list(filters),
    staleTime: 30_000
  });
}

export function tipoServicioDetailOptions(id: number) {
  return queryOptions({
    queryKey: tiposServicioKeys.detail(id),
    queryFn: () => tiposServicioService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
