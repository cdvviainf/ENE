import { queryOptions } from '@tanstack/react-query';
import { paisesService } from './service';

export const paisesKeys = {
  all: ['paises'] as const,
  list: (filters: object) => ['paises', 'list', filters] as const,
  detail: (id: number) => ['paises', 'detail', id] as const
};

export function paisesListOptions(filters: { page?: number; limit?: number; q?: string } = {}) {
  return queryOptions({
    queryKey: paisesKeys.list(filters),
    queryFn: () => paisesService.list(filters),
    staleTime: 30_000
  });
}

export function paisDetailOptions(id: number) {
  return queryOptions({
    queryKey: paisesKeys.detail(id),
    queryFn: () => paisesService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
