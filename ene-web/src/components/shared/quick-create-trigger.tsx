'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';

interface QuickCreateTriggerProps {
  itemMenu: string;
  titulo: string;
  descripcion?: string;
  triggerTitle: string;
  children: (opts: { close: () => void }) => ReactNode;
}

// Chrome genérico del patrón QuickCreate (Docs/mantenedores.md §8, portado de
// FAS: features/comunas/components/comuna-quick-create.tsx). Cada
// `<Entidad>QuickCreate` concreto solo aporta el formulario reducido como
// children — el botón `+`, el diálogo y el gate de permiso son siempre
// iguales (RN-QC-01 a RN-QC-08).
export function QuickCreateTrigger({ itemMenu, titulo, descripcion, triggerTitle, children }: QuickCreateTriggerProps) {
  const [open, setOpen] = useState(false);
  const puedeEscribir = usePuedeEscribir(itemMenu);

  // RN-QC: no se renderiza sin nivel TOTAL sobre el ítem que crearía.
  if (!puedeEscribir) return null;

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='h-9 w-9 shrink-0 self-end'
        onClick={() => setOpen(true)}
        title={triggerTitle}
      >
        <Icons.add className='h-4 w-4' />
      </Button>
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className='sm:max-w-sm'>
            <DialogHeader>
              <DialogTitle>{titulo}</DialogTitle>
              {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
            </DialogHeader>
            {children({ close: () => setOpen(false) })}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
