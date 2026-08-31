'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';

export function CondicionesPagoHeaderActions() {
  const puedeEscribir = usePuedeEscribir('CONDICIONES_PAGO');
  if (!puedeEscribir) return null;

  return (
    <Button asChild>
      <Link href='/config/condiciones-pago/nuevo'>
        <Icons.add className='mr-2 h-4 w-4' />
        Nueva condición de pago
      </Link>
    </Button>
  );
}
