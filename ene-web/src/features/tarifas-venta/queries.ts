import { queryOptions } from '@tanstack/react-query';
import { tarifasVentaService, type ServiciosConTarifaFiltros } from './service';

export const tarifasVentaKeys = {
  all: ['tarifas-venta'] as const,
  servicios: (filters: object) => ['tarifas-venta', 'servicios', filters] as const,
  deServicio: (servicioId: number) => ['tarifas-venta', 'de-servicio', servicioId] as const,
  detail: (id: number) => ['tarifas-venta', 'detail', id] as const
};

export function serviciosConTarifaOptions(filters: ServiciosConTarifaFiltros = {}) {
  return queryOptions({
    queryKey: tarifasVentaKeys.servicios(filters),
    queryFn: () => tarifasVentaService.listServicios(filters),
    staleTime: 30_000
  });
}

export function tarifasDeServicioOptions(servicioId: number) {
  return queryOptions({
    queryKey: tarifasVentaKeys.deServicio(servicioId),
    queryFn: () => tarifasVentaService.listDeServicio(servicioId),
    staleTime: 30_000,
    enabled: servicioId > 0
  });
}

export function tarifaVentaDetailOptions(id: number) {
  return queryOptions({
    queryKey: tarifasVentaKeys.detail(id),
    queryFn: () => tarifasVentaService.getById(id),
    staleTime: 30_000,
    enabled: id > 0
  });
}
