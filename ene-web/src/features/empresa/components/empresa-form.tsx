'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
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

const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export function EmpresaForm() {
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('EMPRESA');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Logo: se pide como blob (vía `api`, con cookies) y se muestra con un
  // objectURL. Se re-pide tras cada subida (la key incluye logoStorageKey).
  const { data: logoBlob } = useQuery({
    queryKey: ['empresa', 'logo', empresa?.logoStorageKey],
    queryFn: () => empresaService.getLogoBlob(),
    enabled: !!empresa?.logoStorageKey,
    staleTime: 0
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!logoBlob) {
      setLogoUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoBlob);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoBlob]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => empresaService.uploadLogo(file),
    onSuccess: () => {
      toast.success('Logo actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: empresaKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al subir el logo'),
    onSettled: () => {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const { FormTextField } = useFormFields<EmpresaFormValues>();

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  if (!puedeEscribir) {
    return (
      <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Mantenedores. No puedes editar los datos de empresa.' />
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
                <FormTextField name='nombre' label='Nombre' required placeholder='Extremo Norte Expediciones' />
                <FormTextField name='rut' label='RUT' placeholder='76.123.456-7' />
                <FormTextField name='direccion' label='Dirección' placeholder='Calle, número, comuna' />
                <FormTextField name='email' label='Email' type='email' placeholder='contacto@extremonorte.com' />
                <FormTextField name='web' label='Sitio web' type='url' placeholder='https://extremonorte.com' />
                <FormTextField name='telefono' label='Teléfono' placeholder='+56 9 1234 5678' />
              </div>
            </CardContent>
          </Card>

          <div className='flex items-center justify-end gap-3'>
            <Button type='submit' isLoading={mutation.isPending}>
              <Icons.check className='mr-2 h-4 w-4' />
              Guardar cambios
            </Button>
          </div>
        </form.Form>
      </form.AppForm>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Logo</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-6'>
            <div className='bg-muted flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border'>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt='Logo de la empresa' className='max-h-full max-w-full object-contain' />
              ) : (
                <Icons.media className='text-muted-foreground h-8 w-8' />
              )}
            </div>
            <div className='space-y-1.5'>
              <Label>Imagen del logo</Label>
              <input
                ref={fileInputRef}
                type='file'
                accept={LOGO_ACCEPT}
                className='block text-sm'
                disabled={uploadMutation.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                }}
              />
              <p className='text-muted-foreground text-xs'>PNG, JPG, WEBP o SVG. Aparece en los documentos emitidos.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
