import { queryOptions } from '@tanstack/react-query';
import { indicadoresService } from './service';

export const indicadoresKeys = {
  all: ['indicadores'] as const,
  detail: () => ['indicadores', 'detail'] as const
};

export function indicadoresDetailOptions() {
  return queryOptions({
    queryKey: indicadoresKeys.detail(),
    queryFn: () => indicadoresService.get(),
    staleTime: 30_000
  });
}
