import { queryOptions } from '@tanstack/react-query';
import { negociosService } from './service';

export const negociosKeys = {
  all: ['negocios'] as const,
  list: (filters: object) => ['negocios', 'list', filters] as const,
  detail: (id: number) => ['negocios', 'detail', id] as const
};

export function negociosListOptions(filters: { page?: number; limit?: number; q?: string; clienteId?: number } = {}) {
  return queryOptions({
    queryKey: negociosKeys.list(filters),
    queryFn: () => negociosService.list(filters),
    staleTime: 30_000
  });
}

export function negocioDetailOptions(id: number) {
  return queryOptions({
    queryKey: negociosKeys.detail(id),
    queryFn: () => negociosService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
