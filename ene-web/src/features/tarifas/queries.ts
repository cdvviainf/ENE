import { queryOptions } from '@tanstack/react-query';
import { tarifasService } from './service';

export const tarifasKeys = {
  all: ['tarifas'] as const,
  list: (filters: object) => ['tarifas', 'list', filters] as const,
  detail: (id: number) => ['tarifas', 'detail', id] as const
};

export function tarifasListOptions(
  filters: { page?: number; limit?: number; proveedorId?: number; servicioId?: number; vigenteA?: string; soloActivos?: boolean } = {}
) {
  return queryOptions({
    queryKey: tarifasKeys.list(filters),
    queryFn: () => tarifasService.list(filters),
    staleTime: 30_000
  });
}

export function tarifarioDetailOptions(id: number) {
  return queryOptions({
    queryKey: tarifasKeys.detail(id),
    queryFn: () => tarifasService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
