import { Icons } from '@/components/icons';

// RN-PER-01: nivel LECTURA puede consultar pero no mutar. Se usa en los
// formularios de alta/edición para las rutas directas (/nuevo, /[id]), que
// RouteAccessGuard no bloquea porque LECTURA no es SIN_ACCESO.
export function SoloLectura({ mensaje }: { mensaje?: string }) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center'>
      <Icons.lock className='text-muted-foreground h-10 w-10' />
      <h2 className='text-lg font-semibold'>Solo lectura</h2>
      <p className='text-muted-foreground max-w-sm text-sm'>
        {mensaje ?? 'Tu perfil solo tiene acceso de lectura a esta sección. No puedes crear ni editar registros.'}
      </p>
    </div>
  );
}
