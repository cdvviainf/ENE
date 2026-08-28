'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';

export function ZonasHeaderActions() {
  const puedeEscribir = usePuedeEscribir('ZONAS');
  if (!puedeEscribir) return null;

  return (
    <Button asChild>
      <Link href='/config/zonas/nuevo'>
        <Icons.add className='mr-2 h-4 w-4' />
        Nueva zona
      </Link>
    </Button>
  );
}
