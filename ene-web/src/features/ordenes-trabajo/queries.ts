import { queryOptions } from '@tanstack/react-query';
import { ordenesTrabajoService, adjuntosService } from './service';
import type { EstadoOT } from './types';

export const ordenesTrabajoKeys = {
  all: ['ordenes-trabajo'] as const,
  list: (filters: object) => ['ordenes-trabajo', 'list', filters] as const,
  detail: (id: number) => ['ordenes-trabajo', 'detail', id] as const,
  version: (id: number, version: number) => ['ordenes-trabajo', 'version', id, version] as const,
  adjuntos: (id: number) => ['ordenes-trabajo', 'adjuntos', id] as const
};

export function ordenesTrabajoListOptions(
  filters: { page?: number; limit?: number; estado?: EstadoOT; desde?: string; hasta?: string; q?: string } = {}
) {
  return queryOptions({
    queryKey: ordenesTrabajoKeys.list(filters),
    queryFn: () => ordenesTrabajoService.list(filters),
    staleTime: 30_000
  });
}

export function ordenTrabajoDetailOptions(id: number) {
  return queryOptions({
    queryKey: ordenesTrabajoKeys.detail(id),
    queryFn: () => ordenesTrabajoService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}

export function ordenTrabajoVersionOptions(id: number, version: number) {
  return queryOptions({
    queryKey: ordenesTrabajoKeys.version(id, version),
    queryFn: () => ordenesTrabajoService.getVersion(id, version),
    staleTime: 30_000,
    // RN-VER-09: la versión histórica es inmutable — se puede cachear sin límite.
    enabled: id > 0 && version > 0
  });
}

export function ordenTrabajoAdjuntosOptions(id: number) {
  return queryOptions({
    queryKey: ordenesTrabajoKeys.adjuntos(id),
    queryFn: () => adjuntosService.list(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
