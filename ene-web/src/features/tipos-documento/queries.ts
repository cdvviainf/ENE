import { queryOptions } from '@tanstack/react-query';
import { tiposDocumentoService } from './service';

export const tiposDocumentoKeys = {
  all: ['tipos-documento'] as const,
  list: (filters: object) => ['tipos-documento', 'list', filters] as const,
  detail: (id: number) => ['tipos-documento', 'detail', id] as const
};

export function tiposDocumentoListOptions(filters: { page?: number; limit?: number; q?: string } = {}) {
  return queryOptions({
    queryKey: tiposDocumentoKeys.list(filters),
    queryFn: () => tiposDocumentoService.list(filters),
    staleTime: 30_000
  });
}

export function tipoDocumentoDetailOptions(id: number) {
  return queryOptions({
    queryKey: tiposDocumentoKeys.detail(id),
    queryFn: () => tiposDocumentoService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
