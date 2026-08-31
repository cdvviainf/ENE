'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { cn } from '@/lib/utils';
import { condicionPagoDetailOptions, condicionesPagoKeys } from '../queries';
import { condicionesPagoService } from '../service';
import type { CondicionPagoCuotaInput } from '../types';

const condicionPagoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim().toUpperCase(),
  nombre: z.string().min(1, 'El nombre es requerido').max(80).trim()
});

type CondicionPagoFormValues = z.infer<typeof condicionPagoSchema>;

// Cuota por defecto para el caso más común: contado, 100% al confirmar.
export const CUOTA_CONTADO: CondicionPagoCuotaInput = { porcentaje: 100, plazoDias: 0 };

// Suma de porcentajes — feedback de UI para habilitar/deshabilitar el submit
// (RN-PAG-02); el backend revalida sobre el payload real antes de persistir,
// esto no reemplaza esa validación. Se suma en centésimos enteros, no con
// `number` redondeado al final: 33.333×3 se ve como "100" en float pero el
// backend guarda 33.33×3=99.99 en Decimal(5,2).
function centesimos(porcentaje: number): number {
  return Number.isFinite(porcentaje) ? Math.round(porcentaje * 100) : 0;
}

export function sumaPorcentajes(cuotas: CondicionPagoCuotaInput[]): number {
  const totalCentesimos = cuotas.reduce((acc, c) => acc + centesimos(c.porcentaje), 0);
  return totalCentesimos / 100;
}

export function cuotasValidas(cuotas: CondicionPagoCuotaInput[]): boolean {
  if (cuotas.length === 0) return false;
  const totalCentesimos = cuotas.reduce((acc, c) => acc + centesimos(c.porcentaje), 0);
  return totalCentesimos === 10000;
}

interface CuotasEditorProps {
  cuotas: CondicionPagoCuotaInput[];
  onChange: (cuotas: CondicionPagoCuotaInput[]) => void;
}

// Cronograma de cuotas: arreglo en useState aparte del useAppForm de
// código/nombre. No hay precedente de field-array dinámico con
// tanstack-form en este repo y este patrón es más simple de mantener.
export function CuotasEditor({ cuotas, onChange }: CuotasEditorProps) {
  const total = sumaPorcentajes(cuotas);
  const valido = cuotasValidas(cuotas);

  const actualizar = (index: number, campo: keyof CondicionPagoCuotaInput, valor: number) => {
    onChange(cuotas.map((c, i) => (i === index ? { ...c, [campo]: valor } : c)));
  };

  const agregar = () => onChange([...cuotas, { porcentaje: 0, plazoDias: 0 }]);

  // RN-PAG-02: siempre debe quedar al menos una cuota.
  const quitar = (index: number) => {
    if (cuotas.length <= 1) return;
    onChange(cuotas.filter((_, i) => i !== index));
  };

  return (
    <div className='space-y-3'>
      <div className='space-y-2'>
        {cuotas.map((cuota, index) => (
          <div key={index} className='flex items-end gap-2'>
            <div className='flex-1 space-y-1.5'>
              {index === 0 && <Label>Porcentaje</Label>}
              <Input
                type='number'
                min={0}
                max={100}
                step='0.01'
                value={cuota.porcentaje}
                onChange={(e) => actualizar(index, 'porcentaje', Number(e.target.value))}
              />
            </div>
            <div className='flex-1 space-y-1.5'>
              {index === 0 && <Label>Plazo (días)</Label>}
              <Input
                type='number'
                min={0}
                step={1}
                value={cuota.plazoDias}
                onChange={(e) => actualizar(index, 'plazoDias', Number(e.target.value))}
              />
            </div>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => quitar(index)}
              disabled={cuotas.length <= 1}
            >
              <Icons.trash className='text-destructive h-4 w-4' />
            </Button>
          </div>
        ))}
      </div>
      <div className='flex items-center justify-between'>
        <Button type='button' variant='outline' size='sm' onClick={agregar}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar cuota
        </Button>
        <p className={cn('text-sm font-medium', valido ? 'text-muted-foreground' : 'text-destructive')}>
          Total: {total}%
        </p>
      </div>
    </div>
  );
}

interface CondicionPagoFormProps {
  condicionPagoId?: number;
}

export function CondicionPagoForm({ condicionPagoId }: CondicionPagoFormProps) {
  const isEdit = !!condicionPagoId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('CONDICIONES_PAGO');

  const { data: condicionPago, isLoading } = useQuery(condicionPagoDetailOptions(condicionPagoId ?? 0));

  const [cuotas, setCuotas] = useState<CondicionPagoCuotaInput[]>([{ ...CUOTA_CONTADO }]);

  const mutation = useMutation({
    mutationFn: (values: CondicionPagoFormValues) =>
      isEdit
        ? condicionesPagoService.update(condicionPagoId!, { ...values, cuotas })
        : condicionesPagoService.create({ ...values, cuotas }),
    onSuccess: () => {
      toast.success(isEdit ? 'Condición de pago actualizada correctamente' : 'Condición de pago creada correctamente');
      queryClient.invalidateQueries({ queryKey: condicionesPagoKeys.all });
      router.push('/config/condiciones-pago');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar la condición de pago')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '' } as CondicionPagoFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: condicionPagoSchema as any },
    onSubmit: async ({ value }) => {
      // RN-PAG-02: el botón ya se deshabilita si no suma 100%, pero se
      // repite el guard acá por si el estado quedó obsoleto.
      if (!cuotasValidas(cuotas)) return;
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (condicionPago) {
      form.setFieldValue('codigo', condicionPago.codigo);
      form.setFieldValue('nombre', condicionPago.nombre);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el editor de cuotas con el registro recién cargado, no con render local
      setCuotas(condicionPago.cuotas.map((c) => ({ porcentaje: Number(c.porcentaje), plazoDias: c.plazoDias })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condicionPago]);

  const { FormTextField } = useFormFields<CondicionPagoFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return (
      <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar condiciones de pago.' />
    );
  }

  return (
    <form.AppForm>
      <form.Form id='condicion-pago-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos de la condición de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: CONTADO' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Contado' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Cuotas</CardTitle>
          </CardHeader>
          <CardContent>
            <CuotasEditor cuotas={cuotas} onChange={setCuotas} />
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/condiciones-pago')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending} disabled={!cuotasValidas(cuotas)}>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Guardar cambios' : 'Crear condición de pago'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
