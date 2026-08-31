import { queryOptions } from '@tanstack/react-query';
import { comunasService } from './service';

export const comunasKeys = {
  all: ['comunas'] as const,
  list: (filters: object) => ['comunas', 'list', filters] as const,
  detail: (id: number) => ['comunas', 'detail', id] as const
};

// limit por defecto alto: el Combobox de Dirección (RN-GEO-02) necesita el
// listado completo de comunas de Chile (~350) sin paginar.
export function comunasListOptions(
  filters: { page?: number; limit?: number; q?: string; provinciaId?: number } = { limit: 400 }
) {
  return queryOptions({
    queryKey: comunasKeys.list(filters),
    queryFn: () => comunasService.list(filters),
    staleTime: 30_000
  });
}

export function comunaDetailOptions(id: number) {
  return queryOptions({
    queryKey: comunasKeys.detail(id),
    queryFn: () => comunasService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
