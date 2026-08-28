'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { SoloLectura } from '@/components/shared/solo-lectura';
import { itemsMenuOptions, perfilDetailOptions, perfilesKeys } from '../queries';
import { perfilesService } from '../service';
import { prefijosCodigoService } from '@/features/prefijos-codigo/service';
import type { NivelAcceso, ItemMenu } from '../types';

const perfilSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50).trim(),
  nombre: z.string().min(1, 'El nombre es requerido').max(200).trim(),
  descripcion: z.string().max(200).trim().optional()
});

type PerfilFormValues = z.infer<typeof perfilSchema>;

const NIVEL_OPTIONS: { value: NivelAcceso; label: string }[] = [
  { value: 'SIN_ACCESO', label: 'Sin acceso' },
  { value: 'LECTURA', label: 'Lectura' },
  { value: 'TOTAL', label: 'Total' }
];

interface PerfilFormProps {
  perfilId?: number;
}

export function PerfilForm({ perfilId }: PerfilFormProps) {
  const isEdit = !!perfilId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('USUARIOS');

  // Ediciones del usuario sobre la matriz, encima de lo cargado en perfilData
  // — evita hacer setState del mapa completo dentro de un efecto al llegar
  // la respuesta de la query (react-hooks/set-state-in-effect).
  const [overrides, setOverrides] = useState<Map<number, NivelAcceso>>(new Map());

  const { data: itemsMenu, isLoading: loadingItems } = useQuery(itemsMenuOptions());
  const { data: perfilData, isLoading: loadingPerfil } = useQuery(perfilDetailOptions(perfilId ?? 0));

  const createMutation = useMutation({
    mutationFn: (values: PerfilFormValues) =>
      perfilesService.create({ ...values, accesos: buildAccesosPayload() }),
    onSuccess: () => {
      toast.success('Perfil creado correctamente');
      queryClient.invalidateQueries({ queryKey: perfilesKeys.all });
      router.push('/config/usuarios/perfiles');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el perfil')
  });

  const updateMutation = useMutation({
    mutationFn: (values: PerfilFormValues) =>
      perfilesService.update(perfilId!, { ...values, accesos: buildAccesosPayload() }),
    onSuccess: () => {
      toast.success('Perfil actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: perfilesKeys.all });
      queryClient.invalidateQueries({ queryKey: perfilesKeys.detail(perfilId!) });
      router.push('/config/usuarios/perfiles');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al actualizar el perfil')
  });

  function buildAccesosPayload() {
    const accesos: { itemMenuId: number; nivel: NivelAcceso }[] = [];
    accesosMap.forEach((nivel, itemMenuId) => {
      if (nivel !== 'SIN_ACCESO') accesos.push({ itemMenuId, nivel });
    });
    return accesos;
  }

  const accesosMap = new Map<number, NivelAcceso>([
    ...(perfilData?.accesos.map((a) => [a.itemMenuId, a.nivel] as const) ?? []),
    ...overrides
  ]);

  function setNivel(itemMenuId: number, nivel: NivelAcceso) {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(itemMenuId, nivel);
      return next;
    });
  }

  function getNivel(itemMenuId: number): NivelAcceso {
    return accesosMap.get(itemMenuId) ?? 'SIN_ACCESO';
  }

  const itemsByModulo = useMemo(() => {
    if (!itemsMenu) return new Map<string, ItemMenu[]>();
    const map = new Map<string, ItemMenu[]>();
    for (const item of itemsMenu) {
      if (!map.has(item.modulo)) map.set(item.modulo, []);
      map.get(item.modulo)!.push(item);
    }
    return map;
  }, [itemsMenu]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useAppForm({
    defaultValues: {
      codigo: perfilData?.codigo ?? '',
      nombre: perfilData?.nombre ?? '',
      descripcion: perfilData?.descripcion ?? ''
    } as PerfilFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: perfilSchema as any },
    onSubmit: async ({ value }) => {
      if (isEdit) {
        await updateMutation.mutateAsync(value);
      } else {
        await createMutation.mutateAsync(value);
      }
    }
  });

  useEffect(() => {
    if (perfilData) {
      form.setFieldValue('codigo', perfilData.codigo);
      form.setFieldValue('nombre', perfilData.nombre);
      form.setFieldValue('descripcion', perfilData.descripcion ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilData]);

  // Sugerencia de código (RN-PER-07) — solo al crear, editable después.
  const { data: codigoSugerido } = useQuery({
    queryKey: ['prefijo-codigo-siguiente', 'PERFIL'],
    queryFn: () => prefijosCodigoService.siguienteCodigo('PERFIL'),
    enabled: !isEdit,
    staleTime: 0
  });

  useEffect(() => {
    if (!isEdit && codigoSugerido) form.setFieldValue('codigo', codigoSugerido);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoSugerido, isEdit]);

  const { FormTextField } = useFormFields<PerfilFormValues>();

  const isLoading = (isEdit && loadingPerfil) || loadingItems;

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-10 animate-pulse rounded' />
        <div className='bg-muted h-64 animate-pulse rounded' />
      </div>
    );
  }

  // RN-PER-01: LECTURA no es SIN_ACCESO, así que RouteAccessGuard deja pasar
  // esta ruta — el formulario en sí debe negarse a ofrecer mutaciones.
  if (!puedeEscribir) {
    return <SoloLectura mensaje='Tu perfil solo tiene acceso de lectura a Usuarios y perfiles. No puedes crear ni editar perfiles.' />;
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Datos del perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form.AppForm>
            <form.Form id='perfil-form' className='grid gap-4 p-0 sm:grid-cols-2'>
              <FormTextField name='codigo' label='Código' required placeholder='Ej: PER-001' disabled={isEdit} />
              <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Coordinación administrativa' />
              <FormTextField
                name='descripcion'
                label='Descripción'
                placeholder='Opcional'
                className='sm:col-span-2'
              />
            </form.Form>
          </form.AppForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Matriz de permisos</CardTitle>
        </CardHeader>
        <CardContent>
          {itemsByModulo.size === 0 ? (
            <p className='text-muted-foreground py-4 text-center text-sm'>No hay ítems de menú configurados.</p>
          ) : (
            <div className='space-y-4'>
              {Array.from(itemsByModulo.entries()).map(([modulo, items], index) => (
                <div key={modulo}>
                  <h4 className='text-muted-foreground mb-2 text-sm font-semibold tracking-wide uppercase'>
                    {modulo}
                  </h4>
                  <div className='overflow-hidden rounded-md border'>
                    <table className='w-full text-sm'>
                      <thead className='bg-muted/50'>
                        <tr>
                          <th className='text-muted-foreground px-3 py-2 text-left text-xs font-medium'>Ítem</th>
                          <th className='text-muted-foreground w-40 px-3 py-2 text-left text-xs font-medium'>
                            Acceso
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y'>
                        {items.map((item) => (
                          <tr key={item.id} className='hover:bg-muted/30 transition-colors'>
                            <td className='px-3 py-2'>
                              <div className='flex items-center gap-2'>
                                <span>{item.nombre}</span>
                                {item.esAccion && (
                                  <Badge variant='secondary' className='px-1.5 py-0 text-xs'>
                                    Acción
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className='px-3 py-2'>
                              <Select value={getNivel(item.id)} onValueChange={(v) => setNivel(item.id, v as NivelAcceso)}>
                                <SelectTrigger className='h-7 w-36 text-xs'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {NIVEL_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className='text-xs'>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {index < itemsByModulo.size - 1 && <Separator className='mt-4' />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className='flex items-center justify-end gap-3'>
        <Button type='button' variant='outline' onClick={() => router.push('/config/usuarios/perfiles')}>
          Cancelar
        </Button>
        <Button type='submit' form='perfil-form' isLoading={isPending}>
          <Icons.check className='mr-2 h-4 w-4' />
          {isEdit ? 'Guardar cambios' : 'Crear perfil'}
        </Button>
      </div>
    </div>
  );
}
