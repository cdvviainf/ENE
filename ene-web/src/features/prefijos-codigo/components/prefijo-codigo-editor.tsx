'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Modal } from '@/components/ui/modal';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { prefijosCodigoService } from '../service';
import type { PrefijoCodigo } from '../types';

export function PrefijoCodigoEditor({ prefijo }: { prefijo: PrefijoCodigo }) {
  const puedeEscribir = usePuedeEscribir('MAESTROS');
  const [open, setOpen] = useState(false);
  const [valores, setValores] = useState({
    prefijo: prefijo.prefijo,
    digitos: prefijo.digitos,
    incluyeAnio: prefijo.incluyeAnio
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => prefijosCodigoService.update(prefijo.id, valores),
    onSuccess: () => {
      toast.success('Prefijo actualizado');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['prefijos-codigo'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al actualizar el prefijo')
  });

  // Nivel LECTURA: el backend rechaza el PATCH con 403 (RN-PER-01). Va
  // después de todos los hooks para no violar rules-of-hooks.
  if (!puedeEscribir) return null;

  return (
    <>
      <Button variant='ghost' size='sm' onClick={() => setOpen(true)}>
        <Icons.edit className='mr-2 h-4 w-4' />
        Editar
      </Button>
      <Modal
        title={`Prefijo — ${prefijo.entidad}`}
        description='La sugerencia de código se recalcula en vivo; cambiar el prefijo no afecta los códigos ya asignados.'
        isOpen={open}
        onClose={() => setOpen(false)}
      >
        <div className='space-y-4 pt-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='prefijo'>Prefijo</Label>
            <Input
              id='prefijo'
              value={valores.prefijo}
              onChange={(e) => setValores((v) => ({ ...v, prefijo: e.target.value.toUpperCase() }))}
              maxLength={10}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='digitos'>Dígitos del correlativo</Label>
            <Input
              id='digitos'
              type='number'
              min={1}
              max={10}
              value={valores.digitos}
              onChange={(e) => setValores((v) => ({ ...v, digitos: Number(e.target.value) }))}
            />
          </div>
          <div className='flex items-center justify-between rounded-md border p-3'>
            <Label htmlFor='incluye-anio' className='font-normal'>
              Incluye año en el correlativo
            </Label>
            <Switch
              id='incluye-anio'
              checked={valores.incluyeAnio}
              onCheckedChange={(v) => setValores((val) => ({ ...val, incluyeAnio: v }))}
            />
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button variant='outline' onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
