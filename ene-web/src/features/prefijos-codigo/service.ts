import { api } from '@/lib/api';
import type { PrefijoCodigo, PrefijoCodigoUpdateInput, EntidadSugerenciaViva } from './types';

export const prefijosCodigoService = {
  async list(): Promise<PrefijoCodigo[]> {
    return api.get('config/prefijos-codigo').json();
  },

  async update(id: number, data: PrefijoCodigoUpdateInput): Promise<PrefijoCodigo> {
    return api.patch(`config/prefijos-codigo/${id}`, { json: data }).json();
  },

  // Sugerencia editable, no reserva nada (RN-PER-07). No lanza si el fetch
  // falla: deja el campo de código vacío para completar a mano.
  async siguienteCodigo(entidad: EntidadSugerenciaViva): Promise<string | null> {
    try {
      const res = await api
        .get(`config/prefijos-codigo/siguiente/${entidad}`)
        .json<{ codigo: string | null }>();
      return res.codigo;
    } catch {
      return null;
    }
  }
};
