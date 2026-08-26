import { Icons } from '@/components/icons';
import type { Icon } from '@/components/icons';

interface ProximamenteProps {
  titulo: string;
  descripcion?: string;
  icon?: Icon;
}

/**
 * Placeholder de una sección del menú cuya pantalla todavía no se construye
 * (Etapa 3: solo el shell y el login). Se retira cuando el módulo real llega
 * en su etapa (ver CLAUDE.md §12).
 */
export function Proximamente({ titulo, descripcion, icon: IconComponent = Icons.clock }: ProximamenteProps) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center'>
      <IconComponent className='text-muted-foreground h-10 w-10' />
      <h1 className='text-xl font-semibold'>{titulo}</h1>
      <p className='text-muted-foreground max-w-sm text-sm'>
        {descripcion ?? 'Esta sección todavía no está construida.'}
      </p>
    </div>
  );
}
