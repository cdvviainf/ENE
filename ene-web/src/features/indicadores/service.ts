import { api } from '@/lib/api';
import type { Indicadores, IndicadoresUpdateInput } from './types';

export const indicadoresService = {
  async get(): Promise<Indicadores> {
    return api.get('config/indicadores').json();
  },

  async update(data: IndicadoresUpdateInput): Promise<Indicadores> {
    return api.put('config/indicadores', { json: data }).json();
  }
};
