'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';

export function ProvinciasHeaderActions() {
  const puedeEscribir = usePuedeEscribir('PROVINCIAS');
  if (!puedeEscribir) return null;

  return (
    <Button asChild>
      <Link href='/config/provincias/nuevo'>
        <Icons.add className='mr-2 h-4 w-4' />
        Nueva provincia
      </Link>
    </Button>
  );
}
