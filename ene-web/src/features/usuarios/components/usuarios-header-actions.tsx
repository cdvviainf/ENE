'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';

export function UsuariosHeaderActions() {
  const puedeEscribir = usePuedeEscribir('USUARIOS');

  return (
    <div className='flex gap-2'>
      <Button variant='outline' asChild>
        <Link href='/config/usuarios/perfiles'>
          <Icons.teams className='mr-2 h-4 w-4' />
          Ver perfiles
        </Link>
      </Button>
      {puedeEscribir && (
        <Button asChild>
          <Link href='/config/usuarios/nuevo'>
            <Icons.add className='mr-2 h-4 w-4' />
            Nuevo usuario
          </Link>
        </Button>
      )}
    </div>
  );
}
