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
import { ClienteDireccionesCard } from './cliente-direcciones-card';
import { formasPagoListOptions } from '@/features/formas-pago/queries';
import { FormaPagoQuickCreate } from '@/features/formas-pago/components/forma-pago-quick-create';
import { condicionesPagoListOptions } from '@/features/condiciones-pago/queries';
import { CondicionPagoQuickCreate } from '@/features/condiciones-pago/components/condicion-pago-quick-create';
import { paisesListOptions } from '@/features/paises/queries';
import { PaisQuickCreate } from '@/features/paises/components/pais-quick-create';

const clienteSchema = z
  .object({
    codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
    tipo: z.enum(['AGENCIA', 'EMPRESA']),
    razonSocial: z.string().min(1, 'La razón social es requerida').max(150).trim(),
    rut: z.string().max(12).trim().optional(),
    nombreComercial: z.string().max(150).trim().optional(),
    paisId: z.coerce.number().int().positive('El país es requerido'),
    monedaHabitual: z.enum(['CLP', 'USD']),
    formaPagoId: z.coerce.number().int().positive().optional(),
    condicionPagoId: z.coerce.number().int().positive().optional(),
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
  const { data: formasPagoData } = useQuery(formasPagoListOptions({ limit: 200 }));
  const { data: condicionesPagoData } = useQuery(condicionesPagoListOptions({ limit: 200 }));
  const { data: paisesData } = useQuery(paisesListOptions({ limit: 200 }));
  const formasPago = formasPagoData?.data ?? [];
  const condicionesPago = condicionesPagoData?.data ?? [];
  const paises = paisesData?.data ?? [];
  const paisNacional = paises.find((p) => p.esPaisNacional);
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
      paisId: 0,
      monedaHabitual: 'USD',
      formaPagoId: undefined,
      condicionPagoId: undefined,
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
      form.setFieldValue('paisId', cliente.paisId);
      form.setFieldValue('monedaHabitual', cliente.monedaHabitual);
      form.setFieldValue('formaPagoId', cliente.formaPagoId ?? undefined);
      form.setFieldValue('condicionPagoId', cliente.condicionPagoId ?? undefined);
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

  const { FormTextField, FormSelectField } = useFormFields<ClienteFormValues>();

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
                          // solo si el usuario no eligió nada todavía.
                          if (v === 'EMPRESA' && !form.getFieldValue('paisId') && paisNacional) {
                            form.setFieldValue('paisId', paisNacional.id);
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

                <form.Field name='paisId'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label>
                        País <span className='text-destructive'>*</span>
                      </Label>
                      <div className='flex items-center gap-2'>
                        <Select
                          value={field.state.value ? String(field.state.value) : ''}
                          onValueChange={(v) => {
                            const id = Number.parseInt(v, 10);
                            if (Number.isFinite(id)) field.handleChange(id);
                          }}
                        >
                          <SelectTrigger className='flex-1'>
                            <SelectValue placeholder='Seleccionar país...' />
                          </SelectTrigger>
                          <SelectContent>
                            {paises.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <PaisQuickCreate
                          onCreated={(nuevo) => {
                            queryClient.invalidateQueries({ queryKey: ['paises'] });
                            form.setFieldValue('paisId', nuevo.id);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </form.Field>

                <FormSelectField name='monedaHabitual' label='Moneda habitual' required options={MONEDA_OPTIONS} />
                <FormTextField name='email' label='Email' type='email' placeholder='contacto@agencia.com' />
                <FormTextField name='telefono' label='Teléfono' placeholder='+56 9 1234 5678' />

                <form.Field name='formaPagoId'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label>Forma de pago</Label>
                      <div className='flex items-center gap-2'>
                        <Select
                          value={field.state.value ? String(field.state.value) : ''}
                          onValueChange={(v) => {
                            const id = Number.parseInt(v, 10);
                            if (Number.isFinite(id)) field.handleChange(id);
                          }}
                        >
                          <SelectTrigger className='flex-1'>
                            <SelectValue placeholder='Sin definir...' />
                          </SelectTrigger>
                          <SelectContent>
                            {formasPago.map((f) => (
                              <SelectItem key={f.id} value={String(f.id)}>
                                {f.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormaPagoQuickCreate
                          onCreated={(nueva) => {
                            queryClient.invalidateQueries({ queryKey: ['formas-pago'] });
                            form.setFieldValue('formaPagoId', nueva.id);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </form.Field>

                <form.Field name='condicionPagoId'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label>Condición de pago</Label>
                      <div className='flex items-center gap-2'>
                        <Select
                          value={field.state.value ? String(field.state.value) : ''}
                          onValueChange={(v) => {
                            const id = Number.parseInt(v, 10);
                            if (Number.isFinite(id)) field.handleChange(id);
                          }}
                        >
                          <SelectTrigger className='flex-1'>
                            <SelectValue placeholder='Sin definir...' />
                          </SelectTrigger>
                          <SelectContent>
                            {condicionesPago.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <CondicionPagoQuickCreate
                          onCreated={(nueva) => {
                            queryClient.invalidateQueries({ queryKey: ['condiciones-pago'] });
                            form.setFieldValue('condicionPagoId', nueva.id);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </form.Field>
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
      {isEdit && cliente && <ClienteDireccionesCard clienteId={cliente.id} direcciones={cliente.direcciones ?? []} />}
    </div>
  );
}
