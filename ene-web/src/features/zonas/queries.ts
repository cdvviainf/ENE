import { queryOptions } from '@tanstack/react-query';
import { zonasService } from './service';

export const zonasKeys = {
  all: ['zonas'] as const,
  list: (filters: object) => ['zonas', 'list', filters] as const,
  detail: (id: number) => ['zonas', 'detail', id] as const
};

export function zonasListOptions(filters: { page?: number; limit?: number; q?: string } = {}) {
  return queryOptions({
    queryKey: zonasKeys.list(filters),
    queryFn: () => zonasService.list(filters),
    staleTime: 30_000
  });
}

export function zonaDetailOptions(id: number) {
  return queryOptions({
    queryKey: zonasKeys.detail(id),
    queryFn: () => zonasService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
