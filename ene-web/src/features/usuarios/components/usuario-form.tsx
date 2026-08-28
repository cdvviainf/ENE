'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { authClient } from '@/lib/auth-client';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { perfilesListOptions } from '@/features/perfiles/queries';
import { prefijosCodigoService } from '@/features/prefijos-codigo/service';
import { usuarioDetailOptions, usuariosKeys } from '../queries';
import { usuariosService } from '../service';
import { PasswordStrengthIndicator } from './password-strength-indicator';
import type { Perfil } from '@/features/perfiles/types';

const usuarioCreateSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50).trim(),
  nombre: z.string().min(1, 'El nombre es requerido').max(200).trim(),
  email: z.string().email('Email inválido').max(200).trim(),
  perfilId: z.coerce.number().int().min(1, 'El perfil es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  passwordConfirm: z.string().min(1, 'Confirma la contraseña')
});

const usuarioEditSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50).trim(),
  nombre: z.string().min(1, 'El nombre es requerido').max(200).trim(),
  perfilId: z.coerce.number().int().min(1, 'El perfil es requerido'),
  activo: z.boolean()
});

type UsuarioCreateValues = z.infer<typeof usuarioCreateSchema>;
type UsuarioEditValues = z.infer<typeof usuarioEditSchema>;

interface UsuarioFormProps {
  usuarioId?: number;
}

export function UsuarioForm({ usuarioId }: UsuarioFormProps) {
  const isEdit = !!usuarioId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [passwordValue, setPasswordValue] = useState('');
  const { data: session } = authClient.useSession();
  const puedeEscribir = usePuedeEscribir('USUARIOS');

  const { data: usuario, isLoading: loadingUsuario } = useQuery(usuarioDetailOptions(usuarioId ?? 0));
  const { data: perfilesData, isLoading: loadingPerfiles } = useQuery(perfilesListOptions({ limit: 200 }));
  const perfiles = (perfilesData?.data ?? []) as Perfil[];

  // RN-PER-05: nadie se cambia el perfil ni se desactiva a sí mismo.
  const esUsuarioActual = isEdit && !!usuario && session?.user.email === usuario.email;

  const createMutation = useMutation({
    mutationFn: (values: UsuarioCreateValues) => usuariosService.create(values),
    onSuccess: () => {
      toast.success('Usuario creado correctamente');
      queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
      router.push('/config/usuarios');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el usuario')
  });

  const updateMutation = useMutation({
    mutationFn: (values: UsuarioEditValues) => usuariosService.update(usuarioId!, values),
    onSuccess: () => {
      toast.success('Usuario actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: usuariosKeys.all });
      queryClient.invalidateQueries({ queryKey: usuariosKeys.detail(usuarioId!) });
      router.push('/config/usuarios');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al actualizar el usuario')
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const createForm = useAppForm({
    defaultValues: {
      codigo: '',
      nombre: '',
      email: '',
      perfilId: 0,
      password: '',
      passwordConfirm: ''
    } as UsuarioCreateValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: usuarioCreateSchema as any },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value);
    }
  });

  const editForm = useAppForm({
    defaultValues: {
      codigo: usuario?.codigo ?? '',
      nombre: usuario?.nombre ?? '',
      perfilId: usuario?.perfilId ?? 0,
      activo: usuario?.activo ?? true
    } as UsuarioEditValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: usuarioEditSchema as any },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value);
    }
  });

  useEffect(() => {
    if (usuario) {
      editForm.setFieldValue('codigo', usuario.codigo);
      editForm.setFieldValue('nombre', usuario.nombre);
      editForm.setFieldValue('perfilId', usuario.perfilId);
      editForm.setFieldValue('activo', usuario.activo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // Sugerencia de código (RN-PER-07) — solo al crear.
  const { data: codigoSugerido } = useQuery({
    queryKey: ['prefijo-codigo-siguiente', 'USUARIO'],
    queryFn: () => prefijosCodigoService.siguienteCodigo('USUARIO'),
    enabled: !isEdit,
    staleTime: 0
  });

  useEffect(() => {
    if (!isEdit && codigoSugerido) createForm.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido, isEdit]);

  const { FormTextField } = useFormFields<UsuarioCreateValues>();

  const isLoading = (isEdit && loadingUsuario) || loadingPerfiles;

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
      </div>
    );
  }

  // RN-PER-01: LECTURA no es SIN_ACCESO, así que RouteAccessGuard deja pasar
  // esta ruta — el formulario en sí debe negarse a ofrecer mutaciones.
  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Usuarios y perfiles. No puedes crear ni editar usuarios.' />;
  }

  if (isEdit) {
    return (
      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos del usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <editForm.AppForm>
              <editForm.Form id='usuario-edit-form' className='grid gap-4 p-0 sm:grid-cols-2'>
                <editForm.Field name='codigo'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label htmlFor='codigo'>Código</Label>
                      <Input id='codigo' value={field.state.value} disabled className='bg-muted' />
                    </div>
                  )}
                </editForm.Field>

                <div className='space-y-1.5'>
                  <Label>Usuario (email)</Label>
                  <Input value={usuario?.email ?? ''} disabled className='bg-muted' />
                  <p className='text-muted-foreground text-xs'>El email no puede modificarse.</p>
                </div>

                <editForm.Field name='nombre'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label htmlFor='nombre'>
                        Nombre <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='nombre'
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder='Ej: Francisco Leyton'
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                      )}
                    </div>
                  )}
                </editForm.Field>

                <editForm.Field name='perfilId'>
                  {(field) => (
                    <div className='space-y-1.5'>
                      <Label>
                        Perfil <span className='text-destructive'>*</span>
                      </Label>
                      <Select
                        value={field.state.value ? String(field.state.value) : ''}
                        onValueChange={(v) => field.handleChange(Number.parseInt(v, 10))}
                        disabled={esUsuarioActual}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Seleccionar perfil...' />
                        </SelectTrigger>
                        <SelectContent>
                          {perfiles.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.nombre}
                              <span className='text-muted-foreground ml-1.5 text-xs'>({p.codigo})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {esUsuarioActual && (
                        <p className='text-muted-foreground text-xs'>No puedes cambiar tu propio perfil.</p>
                      )}
                    </div>
                  )}
                </editForm.Field>

                <editForm.Field name='activo'>
                  {(field) => (
                    <div className='flex items-center justify-between rounded-md border p-3 sm:col-span-2'>
                      <div>
                        <Label htmlFor='activo' className='font-normal'>
                          Usuario activo
                        </Label>
                        {esUsuarioActual && (
                          <p className='text-muted-foreground text-xs'>No puedes desactivar tu propia cuenta.</p>
                        )}
                      </div>
                      <Switch
                        id='activo'
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                        disabled={esUsuarioActual}
                      />
                    </div>
                  )}
                </editForm.Field>
              </editForm.Form>
            </editForm.AppForm>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/usuarios')}>
            Cancelar
          </Button>
          <Button type='submit' form='usuario-edit-form' isLoading={isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            Guardar cambios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <createForm.AppForm>
      <createForm.Form id='usuario-create-form' className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Datos del usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: USR-001' />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Francisco Leyton' />
              <FormTextField
                name='email'
                label='Usuario (email)'
                type='email'
                required
                placeholder='usuario@extremonorte.cl'
              />

              <createForm.Field name='perfilId'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>
                      Perfil <span className='text-destructive'>*</span>
                    </Label>
                    <Select
                      value={field.state.value ? String(field.state.value) : ''}
                      onValueChange={(v) => field.handleChange(Number.parseInt(v, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Seleccionar perfil...' />
                      </SelectTrigger>
                      <SelectContent>
                        {perfiles.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nombre}
                            <span className='text-muted-foreground ml-1.5 text-xs'>({p.codigo})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </createForm.Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <createForm.Field name='password'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>
                      Contraseña <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      type='password'
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setPasswordValue(e.target.value);
                      }}
                      placeholder='••••••••'
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                    )}
                    <PasswordStrengthIndicator password={passwordValue} />
                  </div>
                )}
              </createForm.Field>

              <createForm.Field name='passwordConfirm'>
                {(field) => (
                  <div className='space-y-1.5'>
                    <Label>
                      Confirmar contraseña <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      type='password'
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder='••••••••'
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </createForm.Field>
            </div>
          </CardContent>
        </Card>

        <div className='flex items-center justify-end gap-3'>
          <Button type='button' variant='outline' onClick={() => router.push('/config/usuarios')}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={isPending}>
            <Icons.check className='mr-2 h-4 w-4' />
            Crear usuario
          </Button>
        </div>
      </createForm.Form>
    </createForm.AppForm>
  );
}
