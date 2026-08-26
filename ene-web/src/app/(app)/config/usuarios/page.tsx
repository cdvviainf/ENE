import { Proximamente } from '@/components/shared/proximamente';
import { Icons } from '@/components/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Usuarios y perfiles | Extremo Norte Expediciones' };

// El backend de usuarios/perfiles ya existe (/api/config/usuarios,
// /api/config/perfiles — etapa 3). Esta pantalla CRUD queda para un tramo
// posterior; este tramo cubrió shell + login + navegación por permisos.
export default function UsuariosPage() {
  return (
    <Proximamente
      titulo='Usuarios y perfiles'
      descripcion='El backend ya está listo; la pantalla de administración se construye en un tramo posterior.'
      icon={Icons.teams}
    />
  );
}
