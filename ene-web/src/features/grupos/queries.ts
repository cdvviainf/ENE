import { queryOptions } from '@tanstack/react-query';
import { gruposService } from './service';

export const gruposKeys = {
  all: ['grupos'] as const,
  list: (filters: object) => ['grupos', 'list', filters] as const,
  detail: (id: number) => ['grupos', 'detail', id] as const
};

export function gruposListOptions(filters: { page?: number; limit?: number; q?: string; clienteId?: number } = {}) {
  return queryOptions({
    queryKey: gruposKeys.list(filters),
    queryFn: () => gruposService.list(filters),
    staleTime: 30_000
  });
}

export function grupoDetailOptions(id: number) {
  return queryOptions({
    queryKey: gruposKeys.detail(id),
    queryFn: () => gruposService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
