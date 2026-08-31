import { queryOptions } from '@tanstack/react-query';
import { formasPagoService } from './service';

export const formasPagoKeys = {
  all: ['formas-pago'] as const,
  list: (filters: object) => ['formas-pago', 'list', filters] as const,
  detail: (id: number) => ['formas-pago', 'detail', id] as const
};

export function formasPagoListOptions(filters: { page?: number; limit?: number; q?: string } = {}) {
  return queryOptions({
    queryKey: formasPagoKeys.list(filters),
    queryFn: () => formasPagoService.list(filters),
    staleTime: 30_000
  });
}

export function formaPagoDetailOptions(id: number) {
  return queryOptions({
    queryKey: formasPagoKeys.detail(id),
    queryFn: () => formasPagoService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
