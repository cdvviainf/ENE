import { queryOptions } from '@tanstack/react-query';
import { regionesService } from './service';

export const regionesKeys = {
  all: ['regiones'] as const,
  list: (filters: object) => ['regiones', 'list', filters] as const,
  detail: (id: number) => ['regiones', 'detail', id] as const
};

export function regionesListOptions(filters: { page?: number; limit?: number; q?: string } = {}) {
  return queryOptions({
    queryKey: regionesKeys.list(filters),
    queryFn: () => regionesService.list(filters),
    staleTime: 30_000
  });
}

export function regionDetailOptions(id: number) {
  return queryOptions({
    queryKey: regionesKeys.detail(id),
    queryFn: () => regionesService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
