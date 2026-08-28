'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { clientesKeys } from '../queries';
import { clientesService } from '../service';
import type { Cliente } from '../types';

// Formulario reducido RN-QC-06/RN-QC-08 (Docs/mantenedores.md §8).
const clienteQuickSchema = z
  .object({
    codigo: z.string().min(1, 'Requerido').max(20).trim(),
    tipo: z.enum(['AGENCIA', 'EMPRESA']),
    razonSocial: z.string().min(1, 'Requerido').max(150).trim(),
    rut: z.string().max(12).trim().optional(),
    pais: z.string().min(1, 'Requerido').max(60).trim(),
    monedaHabitual: z.enum(['CLP', 'USD'])
  })
  .refine((data) => data.tipo !== 'EMPRESA' || !!data.rut, {
    message: 'El RUT es obligatorio para clientes de tipo Empresa (RN-CLI-01)',
    path: ['rut']
  });

type ClienteQuickValues = z.infer<typeof clienteQuickSchema>;

const TIPO_OPTIONS = [
  { value: 'AGENCIA', label: 'Agencia de viajes' },
  { value: 'EMPRESA', label: 'Empresa' }
];

const MONEDA_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'CLP', label: 'CLP' }
];

function ClienteQuickForm({ close, onCreated }: { close: () => void; onCreated: (cliente: Cliente) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: ClienteQuickValues) => clientesService.create(values),
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: clientesKeys.all });
      toast.success(`Cliente "${nuevo.razonSocial}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el cliente')
  });

  const { data: codigoSugerido } = useQuery({
    queryKey: ['clientes', 'siguiente-codigo'],
    queryFn: () => clientesService.siguienteCodigo(),
    staleTime: 0
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      tipo: 'AGENCIA',
      razonSocial: '',
      rut: '',
      pais: '',
      monedaHabitual: 'USD'
    } as ClienteQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: clienteQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido]);

  const { FormTextField, FormSelectField } = useFormFields<ClienteQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='cliente-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: CL0001' />
        <form.Field name='tipo'>
          {(field) => (
            <div className='space-y-1.5'>
              <Label>
                Tipo <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={field.state.value}
                onValueChange={(v) => {
                  field.handleChange(v as 'AGENCIA' | 'EMPRESA');
                  // Docs/mantenedores.md §3: default Chile si EMPRESA.
                  if (v === 'EMPRESA' && !form.getFieldValue('pais')) {
                    form.setFieldValue('pais', 'Chile');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Seleccionar...' />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
        <FormTextField name='razonSocial' label='Razón social' required placeholder='Ej: Andes Travel SpA' />
        <form.Subscribe selector={(s) => s.values.tipo}>
          {(tipo) => (
            <FormTextField name='rut' label='RUT' required={tipo === 'EMPRESA'} placeholder='12.345.678-9' />
          )}
        </form.Subscribe>
        <FormTextField name='pais' label='País' required placeholder='Ej: Chile' />
        <FormSelectField name='monedaHabitual' label='Moneda habitual' required options={MONEDA_OPTIONS} />
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear cliente
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function ClienteQuickCreate({ onCreated }: { onCreated: (cliente: Cliente) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='CLIENTES'
      titulo='Nuevo cliente'
      descripcion='Queda disponible de inmediato en el selector.'
      triggerTitle='Crear nuevo cliente'
    >
      {({ close }) => <ClienteQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
