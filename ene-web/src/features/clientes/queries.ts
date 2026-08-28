import { queryOptions } from '@tanstack/react-query';
import { clientesService } from './service';

export const clientesKeys = {
  all: ['clientes'] as const,
  list: (filters: object) => ['clientes', 'list', filters] as const,
  detail: (id: number) => ['clientes', 'detail', id] as const
};

export function clientesListOptions(
  filters: { page?: number; limit?: number; q?: string; tipo?: string; pais?: string; monedaHabitual?: string } = {}
) {
  return queryOptions({
    queryKey: clientesKeys.list(filters),
    queryFn: () => clientesService.list(filters),
    staleTime: 30_000
  });
}

export function clienteDetailOptions(id: number) {
  return queryOptions({
    queryKey: clientesKeys.detail(id),
    queryFn: () => clientesService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
