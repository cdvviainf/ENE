'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';

export function ServiciosHeaderActions() {
  const puedeEscribir = usePuedeEscribir('SERVICIOS');
  if (!puedeEscribir) return null;

  return (
    <Button asChild>
      <Link href='/config/servicios/nuevo'>
        <Icons.add className='mr-2 h-4 w-4' />
        Nuevo servicio
      </Link>
    </Button>
  );
}
