import { api } from '@/lib/api';
import type { Empresa, EmpresaUpdateInput } from './types';

export const empresaService = {
  async get(): Promise<Empresa> {
    return api.get('config/empresa').json();
  },

  async update(data: EmpresaUpdateInput): Promise<Empresa> {
    return api.put('config/empresa', { json: data }).json();
  },

  async uploadLogo(file: File): Promise<Empresa> {
    const formData = new FormData();
    formData.append('file', file);
    // multipart: NO pasar `json`; ky arma el Content-Type con el boundary solo.
    return api.post('config/empresa/logo', { body: formData }).json();
  },

  async getLogoBlob(): Promise<Blob> {
    // Blob vía la instancia `api` para que viajen las cookies de sesión — un
    // <img src='/api/config/empresa/logo'> directo también las enviaría, pero
    // el blob + objectURL permite re-pedirlo tras subir uno nuevo sin caché.
    return api.get('config/empresa/logo').blob();
  }
};
