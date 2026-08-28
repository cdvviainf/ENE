import { queryOptions } from '@tanstack/react-query';
import { serviciosService } from './service';

export const serviciosKeys = {
  all: ['servicios'] as const,
  list: (filters: object) => ['servicios', 'list', filters] as const,
  detail: (id: number) => ['servicios', 'detail', id] as const
};

export function serviciosListOptions(
  filters: { page?: number; limit?: number; q?: string; zonaId?: number; tipoServicioId?: number } = {}
) {
  return queryOptions({
    queryKey: serviciosKeys.list(filters),
    queryFn: () => serviciosService.list(filters),
    staleTime: 30_000
  });
}

export function servicioDetailOptions(id: number) {
  return queryOptions({
    queryKey: serviciosKeys.detail(id),
    queryFn: () => serviciosService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
