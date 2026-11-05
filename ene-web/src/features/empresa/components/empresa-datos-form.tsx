'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { empresaDetailOptions, empresaKeys } from '../queries';
import { empresaService } from '../service';

const empresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(150).trim(),
  rut: z.string().max(12).trim().optional().or(z.literal('')),
  direccion: z.string().max(200).trim().optional().or(z.literal('')),
  email: z.string().email('Email inválido').max(120).trim().optional().or(z.literal('')),
  web: z.string().url('URL inválida').max(200).trim().optional().or(z.literal('')),
  telefono: z.string().max(40).trim().optional().or(z.literal(''))
});

type EmpresaFormValues = z.infer<typeof empresaSchema>;

export function EmpresaDatosForm() {
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('CONFIGURACION_GENERAL');

  const { data: empresa, isLoading } = useQuery(empresaDetailOptions());

  const mutation = useMutation({
    mutationFn: (values: EmpresaFormValues) => {
      const payload = {
        nombre: values.nombre,
        rut: values.rut ? values.rut : null,
        direccion: values.direccion ? values.direccion : null,
        email: values.email ? values.email : null,
        web: values.web ? values.web : null,
        telefono: values.telefono ? values.telefono : null
      };
      return empresaService.update(payload);
    },
    onSuccess: () => {
      toast.success('Datos de empresa guardados correctamente');
      queryClient.invalidateQueries({ queryKey: empresaKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar los datos de empresa')
  });

  const form = useAppForm({
    defaultValues: {
      nombre: '',
      rut: '',
      direccion: '',
      email: '',
      web: '',
      telefono: ''
    } as EmpresaFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: empresaSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (empresa) {
      form.setFieldValue('nombre', empresa.nombre);
      form.setFieldValue('rut', empresa.rut ?? '');
      form.setFieldValue('direccion', empresa.direccion ?? '');
      form.setFieldValue('email', empresa.email ?? '');
      form.setFieldValue('web', empresa.web ?? '');
      form.setFieldValue('telefono', empresa.telefono ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa]);

  const { FormTextField } = useFormFields<EmpresaFormValues>();

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <form.AppForm>
        <form.Form id='empresa-form' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Datos de la empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormTextField name='nombre' disabled={!puedeEscribir} label='Nombre' required placeholder='Extremo Norte Expediciones' />
                <FormTextField name='rut' disabled={!puedeEscribir} label='RUT' placeholder='76.123.456-7' />
                <FormTextField name='direccion' disabled={!puedeEscribir} label='Dirección' placeholder='Calle, número, comuna' />
                <FormTextField name='email' disabled={!puedeEscribir} label='Email' type='email' placeholder='contacto@extremonorte.com' />
                <FormTextField name='web' disabled={!puedeEscribir} label='Sitio web' type='url' placeholder='https://extremonorte.com' />
                <FormTextField name='telefono' disabled={!puedeEscribir} label='Teléfono' placeholder='+56 9 1234 5678' />
              </div>
            </CardContent>
          </Card>

          {/* QA-CFG-002: con LECTURA se ven los datos (campos deshabilitados) y
              solo se oculta la acción de guardar. */}
          {puedeEscribir ? (
            <div className='flex items-center justify-end gap-3'>
              <Button type='submit' isLoading={mutation.isPending}>
                <Icons.check className='mr-2 h-4 w-4' />
                Guardar cambios
              </Button>
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              Tu perfil tiene acceso de solo lectura a Configuración general.
            </p>
          )}
        </form.Form>
      </form.AppForm>

    </div>
  );
}
