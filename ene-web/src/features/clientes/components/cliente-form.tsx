'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { clienteDetailOptions, clientesKeys } from '../queries';
import { clientesService } from '../service';
import { ClienteEjecutivosCard } from './cliente-ejecutivos-card';

const clienteSchema = z
  .object({
    codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
    tipo: z.enum(['AGENCIA', 'EMPRESA']),
    razonSocial: z.string().min(1, 'La razón social es requerida').max(150).trim(),
    rut: z.string().max(12).trim().optional(),
    nombreComercial: z.string().max(150).trim().optional(),
    pais: z.string().min(1, 'El país es requerido').max(60).trim(),
    monedaHabitual: z.enum(['CLP', 'USD']),
    condicionesPago: z.string().optional(),
    email: z.string().email('Email inválido').max(120).trim().optional().or(z.literal('')),
    telefono: z.string().max(40).trim().optional()
  })
  // RN-CLI-01 [BLOQUEA]: rut obligatorio si tipo=EMPRESA.
  .refine((data) => data.tipo !== 'EMPRESA' || !!data.rut, {
    message: 'El RUT es obligatorio para clientes de tipo Empresa (RN-CLI-01)',
    path: ['rut']
  });

type ClienteFormValues = z.infer<typeof clienteSchema>;

const TIPO_OPTIONS = [
  { value: 'AGENCIA', label: 'Agencia de viajes' },
  { value: 'EMPRESA', label: 'Empresa' }
];

const MONEDA_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'CLP', label: 'CLP' }
];

interface ClienteFormProps {
  clienteId?: number;
}

export function ClienteForm({ clienteId }: ClienteFormProps) {
  const isEdit = !!clienteId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('CLIENTES');

  const { data: cliente, isLoading } = useQuery(clienteDetailOptions(clienteId ?? 0));
  // RN-CLI-02 [ADVIERTE]: confirmar antes de cambiar el tipo de un cliente
  // que ya tiene operaciones (afecta la moneda por defecto de cotizaciones nuevas).
  const [cambioTipoPendiente, setCambioTipoPendiente] = useState<ClienteFormValues | null>(null);

  const mutation = useMutation({
    mutationFn: (values: ClienteFormValues) => {
      const payload = { ...values, email: values.email || undefined };
      return isEdit ? clientesService.update(clienteId!, payload) : clientesService.create(payload);
    },
    onSuccess: (resultado) => {
      toast.success(isEdit ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
      queryClient.invalidateQueries({ queryKey: clientesKeys.all });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: clientesKeys.detail(clienteId!) });
      } else {
        router.push(`/config/clientes/${resultado.id}`);
        return;
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el cliente')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      tipo: 'AGENCIA',
      razonSocial: '',
      rut: '',
      nombreComercial: '',
      pais: '',
      monedaHabitual: 'USD',
      condicionesPago: '',
      email: '',
      telefono: ''
    } as ClienteFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: clienteSchema as any },
    onSubmit: async ({ value }) => {
      if (isEdit && cliente?.tieneOperaciones && value.tipo !== cliente.tipo) {
        setCambioTipoPendiente(value);
        return;
      }
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (cliente) {
      form.setFieldValue('codigo', cliente.codigo);
      form.setFieldValue('tipo', cliente.tipo);
      form.setFieldValue('razonSocial', cliente.razonSocial);
      form.setFieldValue('rut', cliente.rut ?? '');
      form.setFieldValue('nombreComercial', cliente.nombreComercial ?? '');
      form.setFieldValue('pais', cliente.pais);
      form.setFieldValue('monedaHabitual', cliente.monedaHabitual);
      form.setFieldValue('condicionesPago', cliente.condicionesPago ?? '');
      form.setFieldValue('email', cliente.email ?? '');
      form.setFieldValue('telefono', cliente.telefono ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  // Sugerencia de código (RN-MAN-02) — solo al crear.
  const { data: codigoSugerido } = useQuery({
    queryKey: ['clientes', 'siguiente-codigo'],
    queryFn: () => clientesService.siguienteCodigo(),
    enabled: !isEdit,
    staleTime: 0
  });

  useEffect(() => {
    if (!isEdit && codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido, isEdit]);

  const { FormTextField, FormSelectField, FormTextareaField } = useFormFields<ClienteFormValues>();

  if (isEdit && isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar clientes.' />;
  }

  return (
    <div className='space-y-6'>
      <form.AppForm>
        <form.Form id='cliente-form' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Datos del cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormTextField name='codigo' label='Código' required placeholder='Ej: CL0001' disabled={isEdit} />
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
                          // Docs/mantenedores.md §3: default Chile si EMPRESA,
                          // solo si el usuario no escribió nada todavía.
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
                    <FormTextField
                      name='rut'
                      label='RUT'
                      required={tipo === 'EMPRESA'}
                      placeholder='12.345.678-9'
                    />
                  )}
                </form.Subscribe>
                <FormTextField name='nombreComercial' label='Nombre comercial' placeholder='Opcional' />
                <FormTextField name='pais' label='País' required placeholder='Ej: Chile' />
                <FormSelectField name='monedaHabitual' label='Moneda habitual' required options={MONEDA_OPTIONS} />
                <FormTextField name='email' label='Email' type='email' placeholder='contacto@agencia.com' />
                <FormTextField name='telefono' label='Teléfono' placeholder='+56 9 1234 5678' />
              </div>
              <div className='mt-4'>
                <FormTextareaField name='condicionesPago' label='Condiciones de pago' placeholder='Texto libre' />
              </div>
            </CardContent>
          </Card>

          <div className='flex items-center justify-end gap-3'>
            <Button type='button' variant='outline' onClick={() => router.push('/config/clientes')}>
              Cancelar
            </Button>
            <Button type='submit' isLoading={mutation.isPending}>
              <Icons.check className='mr-2 h-4 w-4' />
              {isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </form.Form>
      </form.AppForm>

      <AlertModal
        isOpen={!!cambioTipoPendiente}
        onClose={() => setCambioTipoPendiente(null)}
        onConfirm={async () => {
          if (!cambioTipoPendiente) return;
          await mutation.mutateAsync(cambioTipoPendiente);
          setCambioTipoPendiente(null);
        }}
        loading={mutation.isPending}
        title='¿Cambiar el tipo de cliente?'
        description='Este cliente ya tiene operaciones. Cambiar el tipo cambia la moneda por defecto de las cotizaciones nuevas, no de las existentes (RN-CLI-02).'
      />

      {isEdit && cliente && <ClienteEjecutivosCard clienteId={cliente.id} ejecutivos={cliente.ejecutivos ?? []} />}
    </div>
  );
}
