import { queryOptions } from '@tanstack/react-query';
import { condicionesPagoService } from './service';

export const condicionesPagoKeys = {
  all: ['condiciones-pago'] as const,
  list: (filters: object) => ['condiciones-pago', 'list', filters] as const,
  detail: (id: number) => ['condiciones-pago', 'detail', id] as const
};

export function condicionesPagoListOptions(filters: { page?: number; limit?: number; q?: string } = {}) {
  return queryOptions({
    queryKey: condicionesPagoKeys.list(filters),
    queryFn: () => condicionesPagoService.list(filters),
    staleTime: 30_000
  });
}

export function condicionPagoDetailOptions(id: number) {
  return queryOptions({
    queryKey: condicionesPagoKeys.detail(id),
    queryFn: () => condicionesPagoService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
