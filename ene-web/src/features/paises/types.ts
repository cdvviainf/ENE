export interface Pais {
  id: number;
  codigo: string;
  nombre: string;
  esPaisNacional: boolean;
  creadoEn: string;
  actualizadoEn: string | null;
}

export interface PaisListResponse {
  data: Pais[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// esPaisNacional no viaja en el input: es un hecho estructural fijado por el
// seed (Chile), no un atributo editable del mantenedor (RN-GEO-02).
export interface PaisCreateInput {
  codigo: string;
  nombre: string;
}

export type PaisUpdateInput = Partial<PaisCreateInput>;
