'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { zonasListOptions } from '@/features/zonas/queries';
import { ZonaQuickCreate } from '@/features/zonas/components/zona-quick-create';
import { tiposServicioListOptions } from '@/features/tipos-servicio/queries';
import { TipoServicioQuickCreate } from '@/features/tipos-servicio/components/tipo-servicio-quick-create';
import { proveedorDetailOptions, proveedoresKeys } from '../queries';
import { proveedoresService } from '../service';
import { ProveedorAliasCard } from './proveedor-alias-card';
import { ProveedorCuentasCard } from './proveedor-cuentas-card';
import { ProveedorContactosCard } from './proveedor-contactos-card';
import { ProveedorDireccionesCard } from './proveedor-direcciones-card';
import { formasPagoListOptions } from '@/features/formas-pago/queries';
import { FormaPagoQuickCreate } from '@/features/formas-pago/components/forma-pago-quick-create';
import { condicionesPagoListOptions } from '@/features/condiciones-pago/queries';
import { CondicionPagoQuickCreate } from '@/features/condiciones-pago/components/condicion-pago-quick-create';

const proveedorSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(20).trim(),
  razonSocial: z.string().min(1, 'La razón social es requerida').max(150).trim(),
  rut: z.string().min(1, 'El RUT es requerido').max(12).trim(),
  nombreComercial: z.string().max(150).trim().optional(),
  tipoServicioId: z.coerce.number().int().positive('El tipo de servicio es requerido'),
  zonas: z.array(z.number()).optional(),
  formaPagoId: z.coerce.number().int().positive().optional(),
  condicionPagoId: z.coerce.number().int().positive().optional(),
  politicaCancelacion: z.string().optional(),
  email: z.string().email('Email inválido').max(120).trim().optional().or(z.literal('')),
  telefono: z.string().max(40).trim().optional()
});

type ProveedorFormValues = z.infer<typeof proveedorSchema>;

interface ProveedorFormProps {
  proveedorId?: number;
}

export function ProveedorForm({ proveedorId }: ProveedorFormProps) {
  const isEdit = !!proveedorId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('PROVEEDORES');

  const { data: proveedor, isLoading } = useQuery(proveedorDetailOptions(proveedorId ?? 0));
  const { data: zonasData } = useQuery(zonasListOptions({ limit: 200 }));
  const { data: tiposData } = useQuery(tiposServicioListOptions({ limit: 200 }));
  const { data: formasPagoData } = useQuery(formasPagoListOptions({ limit: 200 }));
  const { data: condicionesPagoData } = useQuery(condicionesPagoListOptions({ limit: 200 }));
  const zonas = zonasData?.data ?? [];
  const tipos = tiposData?.data ?? [];
  const formasPago = formasPagoData?.data ?? [];
  const condicionesPago = condicionesPagoData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: ProveedorFormValues) => {
      const payload = { ...values, email: values.email || undefined };
      return isEdit ? proveedoresService.update(proveedorId!, payload) : proveedoresService.create(payload);
    },
    onSuccess: (resultado) => {
      toast.success(isEdit ? 'Proveedor actualizado correctamente' : 'Proveedor creado correctamente');
      queryClient.invalidateQueries({ queryKey: proveedoresKeys.all });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: proveedoresKeys.detail(proveedorId!) });
      } else {
        router.push(`/config/proveedores/${resultado.id}`);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el proveedor')
  });

  const form = useAppForm({
    defaultValues: {
      codigo: '',
      razonSocial: '',
      rut: '',
      nombreComercial: '',
      tipoServicioId: 0,
      zonas: [],
      formaPagoId: undefined,
      condicionPagoId: undefined,
      politicaCancelacion: '',
      email: '',
      telefono: ''
    } as ProveedorFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: proveedorSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (proveedor) {
      form.setFieldValue('codigo', proveedor.codigo);
      form.setFieldValue('razonSocial', proveedor.razonSocial);
      form.setFieldValue('rut', proveedor.rut);
      form.setFieldValue('nombreComercial', proveedor.nombreComercial ?? '');
      form.setFieldValue('tipoServicioId', proveedor.tipoServicioId);
      form.setFieldValue('zonas', (proveedor.zonas ?? []).map((z) => z.zonaId));
      form.setFieldValue('formaPagoId', proveedor.formaPagoId ?? undefined);
      form.setFieldValue('condicionPagoId', proveedor.condicionPagoId ?? undefined);
      form.setFieldValue('politicaCancelacion', proveedor.politicaCancelacion ?? '');
      form.setFieldValue('email', proveedor.email ?? '');
      form.setFieldValue('telefono', proveedor.telefono ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedor]);

  const { data: codigoSugerido } = useQuery({
    queryKey: ['proveedores', 'siguiente-codigo'],
    queryFn: () => proveedoresService.siguienteCodigo(),
    enabled: !isEdit,
    staleTime: 0
  });

  useEffect(() => {
    if (!isEdit && codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido, isEdit]);

  const { FormTextField, FormTextareaField } = useFormFields<ProveedorFormValues>();

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
      <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes crear ni editar proveedores.' />
    );
  }

  return (
    <div className='space-y-6'>
      <form.AppForm>
        <form.Form id='proveedor-form' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Datos del proveedor</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormTextField name='codigo' label='Código' required placeholder='Ej: PR0001' disabled={isEdit} />
                <FormTextField
                  name='razonSocial'
                  label='Razón social'
                  required
                  placeholder='Como aparece en la factura'
                />
                <FormTextField name='rut' label='RUT' required placeholder='12.345.678-9' />
                <FormTextField name='nombreComercial' label='Nombre comercial' placeholder='Como lo conoce el equipo' />

                <form.Field name='tipoServicioId'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label>
                        Tipo de servicio <span className='text-destructive'>*</span>
                      </Label>
                      <div className='flex items-center gap-2'>
                        <Select
                          value={field.state.value ? String(field.state.value) : ''}
                          onValueChange={(v) => {
                            // Radix puede disparar onValueChange con un valor no
                            // parseable al remontar SelectContent (p. ej. al
                            // refrescar la lista tras un QuickCreate) — ignorarlo
                            // evita resetear el campo a NaN.
                            const id = Number.parseInt(v, 10);
                            if (Number.isFinite(id)) field.handleChange(id);
                          }}
                        >
                          <SelectTrigger className='flex-1'>
                            <SelectValue placeholder='Seleccionar tipo de servicio...' />
                          </SelectTrigger>
                          <SelectContent>
                            {tipos.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <TipoServicioQuickCreate
                          onCreated={(nuevo) => {
                            queryClient.invalidateQueries({ queryKey: ['tipos-servicio'] });
                            // form.setFieldValue (no field.handleChange): el callback
                            // corre después del ciclo de vida async del diálogo hijo.
                            form.setFieldValue('tipoServicioId', nuevo.id);
                          }}
                        />
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                      )}
                    </div>
                  )}
                </form.Field>

                <FormTextField name='email' label='Email' type='email' placeholder='contacto@proveedor.cl' />
                <FormTextField name='telefono' label='Teléfono' placeholder='+56 9 1234 5678' />
              </div>

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
                                field.handleChange(
                                  activa ? seleccionadas.filter((id) => id !== z.id) : [...seleccionadas, z.id]
                                )
                              }
                            >
                              {z.nombre}
                            </Badge>
                          );
                        })}
                        <ZonaQuickCreate
                          onCreated={(nueva) => {
                            queryClient.invalidateQueries({ queryKey: ['zonas'] });
                            form.setFieldValue('zonas', [...seleccionadas, nueva.id]);
                          }}
                        />
                      </div>
                    </div>
                  );
                }}
              </form.Field>

              <div className='grid gap-4 sm:grid-cols-2'>
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

                <FormTextareaField name='politicaCancelacion' label='Política de cancelación' placeholder='Opcional' />
              </div>
            </CardContent>
          </Card>

          <div className='flex items-center justify-end gap-3'>
            <Button type='button' variant='outline' onClick={() => router.push('/config/proveedores')}>
              Cancelar
            </Button>
            <Button type='submit' isLoading={mutation.isPending}>
              <Icons.check className='mr-2 h-4 w-4' />
              {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </form.Form>
      </form.AppForm>

      {isEdit && proveedor && (
        <>
          <ProveedorAliasCard proveedorId={proveedor.id} alias={proveedor.alias ?? []} />
          <ProveedorCuentasCard proveedorId={proveedor.id} cuentas={proveedor.cuentas ?? []} />
          <ProveedorContactosCard proveedorId={proveedor.id} contactos={proveedor.contactos ?? []} />
          <ProveedorDireccionesCard proveedorId={proveedor.id} direcciones={proveedor.direcciones ?? []} />
        </>
      )}
    </div>
  );
}
