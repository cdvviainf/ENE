import { queryOptions } from '@tanstack/react-query';
import { provinciasService } from './service';

export const provinciasKeys = {
  all: ['provincias'] as const,
  list: (filters: object) => ['provincias', 'list', filters] as const,
  detail: (id: number) => ['provincias', 'detail', id] as const
};

export function provinciasListOptions(
  filters: { page?: number; limit?: number; q?: string; regionId?: number } = {}
) {
  return queryOptions({
    queryKey: provinciasKeys.list(filters),
    queryFn: () => provinciasService.list(filters),
    staleTime: 30_000
  });
}

export function provinciaDetailOptions(id: number) {
  return queryOptions({
    queryKey: provinciasKeys.detail(id),
    queryFn: () => provinciasService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
