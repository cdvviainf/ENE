import { queryOptions } from '@tanstack/react-query';
import { empresaService } from './service';

export const empresaKeys = {
  all: ['empresa'] as const,
  detail: () => ['empresa', 'detail'] as const
};

export function empresaDetailOptions() {
  return queryOptions({
    queryKey: empresaKeys.detail(),
    queryFn: () => empresaService.get(),
    staleTime: 30_000
  });
}
