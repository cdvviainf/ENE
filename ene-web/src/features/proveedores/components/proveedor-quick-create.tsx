'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { zonasListOptions } from '@/features/zonas/queries';
import { ZonaQuickCreate } from '@/features/zonas/components/zona-quick-create';
import { tiposServicioListOptions } from '@/features/tipos-servicio/queries';
import { TipoServicioQuickCreate } from '@/features/tipos-servicio/components/tipo-servicio-quick-create';
import { proveedoresKeys } from '../queries';
import { proveedoresService } from '../service';
import type { Proveedor } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8): solo lo
// indispensable para que el proveedor sea válido — el resto se completa
// después en el mantenedor completo. tiposServicio es N:N (RN-PRV-08), no una
// FK única como sugiere la tabla original de la doc.
const proveedorQuickSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20).trim(),
  razonSocial: z.string().min(1, 'Requerido').max(150).trim(),
  rut: z.string().min(1, 'Requerido').max(12).trim(),
  tiposServicio: z.array(z.number()).min(1, 'Selecciona al menos un tipo de servicio'),
  zonas: z.array(z.number()).optional()
});

type ProveedorQuickValues = z.infer<typeof proveedorQuickSchema>;

function ProveedorQuickForm({ close, onCreated }: { close: () => void; onCreated: (proveedor: Proveedor) => void }) {
  const queryClient = useQueryClient();
  const { data: zonasData } = useQuery(zonasListOptions({ limit: 200 }));
  const { data: tiposData } = useQuery(tiposServicioListOptions({ limit: 200 }));
  const zonas = zonasData?.data ?? [];
  const tipos = tiposData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ProveedorQuickValues) => proveedoresService.create(values),
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.all });
      toast.success(`Proveedor "${nuevo.razonSocial}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el proveedor')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', razonSocial: '', rut: '', tiposServicio: [], zonas: [] } as ProveedorQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: proveedorQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  // Sugerencia de código (RN-MAN-02).
  const { data: codigoSugerido } = useQuery({
    queryKey: ['proveedores', 'siguiente-codigo'],
    queryFn: () => proveedoresService.siguienteCodigo(),
    staleTime: 0
  });
  useEffect(() => {
    if (codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido]);

  const { FormTextField } = useFormFields<ProveedorQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='proveedor-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: PR0001' />
        <FormTextField name='razonSocial' label='Razón social' required placeholder='Ej: Transportes QA' />
        <FormTextField name='rut' label='RUT' required placeholder='Ej: 76.123.456-7' />

        <form.Field name='tiposServicio'>
          {(field) => {
            const seleccionados = field.state.value ?? [];
            return (
              <div className='space-y-1.5'>
                <Label>
                  Tipos de servicio <span className='text-destructive'>*</span>
                </Label>
                <div className='flex flex-wrap items-center gap-2'>
                  {tipos.map((t) => {
                    const activo = seleccionados.includes(t.id);
                    return (
                      <Badge
                        key={t.id}
                        variant={activo ? 'default' : 'outline'}
                        className='cursor-pointer select-none'
                        onClick={() =>
                          field.handleChange(activo ? seleccionados.filter((id) => id !== t.id) : [...seleccionados, t.id])
                        }
                      >
                        {t.nombre}
                      </Badge>
                    );
                  })}
                  <TipoServicioQuickCreate
                    onCreated={(nuevo) => {
                      queryClient.invalidateQueries({ queryKey: ['tipos-servicio'] });
                      field.handleChange([...seleccionados, nuevo.id]);
                    }}
                  />
                </div>
                {field.state.meta.errors.length > 0 && (
                  <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            );
          }}
        </form.Field>

        <form.Field name='zonas'>
          {(field) => {
            const seleccionadas = field.state.value ?? [];
            return (
              <div className='space-y-1.5'>
                <Label>Zonas donde opera</Label>
                <div className='flex flex-wrap items-center gap-2'>
                  {zonas.map((z) => {
                    const activa = seleccionadas.includes(z.id);
                    return (
                      <Badge
                        key={z.id}
                        variant={activa ? 'default' : 'outline'}
                        className='cursor-pointer select-none'
                        onClick={() =>
                          field.handleChange(activa ? seleccionadas.filter((id) => id !== z.id) : [...seleccionadas, z.id])
                        }
                      >
                        {z.nombre}
                      </Badge>
                    );
                  })}
                  <ZonaQuickCreate
                    onCreated={(nueva) => {
                      queryClient.invalidateQueries({ queryKey: ['zonas'] });
                      field.handleChange([...seleccionadas, nueva.id]);
                    }}
                  />
                </div>
              </div>
            );
          }}
        </form.Field>

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear proveedor
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function ProveedorQuickCreate({ onCreated }: { onCreated: (proveedor: Proveedor) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='PROVEEDORES'
      titulo='Nuevo proveedor'
      descripcion='Queda disponible de inmediato en el selector. El resto de la ficha se completa después en Proveedores.'
      triggerTitle='Crear nuevo proveedor'
    >
      {({ close }) => <ProveedorQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
