'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';

export function PaisesHeaderActions() {
  const puedeEscribir = usePuedeEscribir('PAISES');
  if (!puedeEscribir) return null;

  return (
    <Button asChild>
      <Link href='/config/paises/nuevo'>
        <Icons.add className='mr-2 h-4 w-4' />
        Nuevo país
      </Link>
    </Button>
  );
}
