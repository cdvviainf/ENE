import { queryOptions } from '@tanstack/react-query';
import { proveedoresService } from './service';

export const proveedoresKeys = {
  all: ['proveedores'] as const,
  list: (filters: object) => ['proveedores', 'list', filters] as const,
  detail: (id: number) => ['proveedores', 'detail', id] as const
};

export function proveedoresListOptions(
  filters: { page?: number; limit?: number; q?: string; tipoServicioId?: number; zonaId?: number } = {}
) {
  return queryOptions({
    queryKey: proveedoresKeys.list(filters),
    queryFn: () => proveedoresService.list(filters),
    staleTime: 30_000
  });
}

export function proveedorDetailOptions(id: number) {
  return queryOptions({
    queryKey: proveedoresKeys.detail(id),
    queryFn: () => proveedoresService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
