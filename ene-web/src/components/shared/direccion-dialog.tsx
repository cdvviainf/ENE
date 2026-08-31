'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { paisesListOptions } from '@/features/paises/queries';
import { PaisQuickCreate } from '@/features/paises/components/pais-quick-create';
import { comunasListOptions } from '@/features/comunas/queries';
import { ComunaQuickCreate } from '@/features/comunas/components/comuna-quick-create';

export type DireccionFormValues = {
  etiqueta: string;
  paisId: number;
  comunaId?: number;
  direccion: string;
  esPorDefecto: boolean;
};

function buildDireccionSchema(idsNacionales: Set<number>) {
  return z
    .object({
      etiqueta: z.string().min(1, 'La etiqueta es requerida').max(80).trim(),
      paisId: z.coerce.number().int().positive('El país es requerido'),
      comunaId: z.coerce.number().int().positive().optional(),
      direccion: z.string().min(1, 'La dirección es requerida').max(200).trim(),
      esPorDefecto: z.boolean().default(false)
    })
    // RN-GEO-02: espejo en cliente de la validación del backend
    // (shared/direcciones.ts) — feedback inmediato, no reemplaza esa validación.
    .refine((data) => !idsNacionales.has(data.paisId) || !!data.comunaId, {
      message: 'La comuna es requerida cuando el país es Chile (RN-GEO-02)',
      path: ['comunaId']
    });
}

interface DireccionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: DireccionFormValues;
  onSubmit: (values: DireccionFormValues) => Promise<unknown>;
  isPending: boolean;
  title: string;
}

const VALORES_VACIOS: DireccionFormValues = {
  etiqueta: '',
  paisId: 0,
  comunaId: undefined,
  direccion: '',
  esPorDefecto: false
};

// Diálogo compartido de alta/edición de Dirección (RN-GEO-01/02/03), usado
// tanto por ClienteDireccionesCard como por ProveedorDireccionesCard — el
// shape de DireccionInput es idéntico en ambos, no hay motivo para duplicarlo.
export function DireccionDialog({ open, onOpenChange, initial, onSubmit, isPending, title }: DireccionDialogProps) {
  const queryClient = useQueryClient();
  const { data: paisesData } = useQuery(paisesListOptions({ limit: 200 }));
  const { data: comunasData } = useQuery(comunasListOptions({ limit: 400 }));
  const paises = paisesData?.data ?? [];
  const comunas = comunasData?.data ?? [];

  const idsNacionales = useMemo(
    () => new Set((paisesData?.data ?? []).filter((p) => p.esPaisNacional).map((p) => p.id)),
    [paisesData]
  );
  const direccionSchema = useMemo(() => buildDireccionSchema(idsNacionales), [idsNacionales]);

  const form = useAppForm({
    defaultValues: initial ?? VALORES_VACIOS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: direccionSchema as any },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    }
  });

  useEffect(() => {
    if (open) {
      const valores = initial ?? VALORES_VACIOS;
      form.setFieldValue('etiqueta', valores.etiqueta);
      form.setFieldValue('paisId', valores.paisId);
      form.setFieldValue('comunaId', valores.comunaId);
      form.setFieldValue('direccion', valores.direccion);
      form.setFieldValue('esPorDefecto', valores.esPorDefecto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { FormTextField, FormCheckboxField } = useFormFields<DireccionFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>La comuna es obligatoria cuando el país es Chile (RN-GEO-02).</DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form id='direccion-form' className='space-y-3'>
            <FormTextField name='etiqueta' label='Etiqueta' required placeholder='Ej: Oficina principal' />

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
                        if (!Number.isFinite(id)) return;
                        field.handleChange(id);
                        if (!idsNacionales.has(id)) form.setFieldValue('comunaId', undefined);
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

            <form.Subscribe selector={(s) => s.values.paisId}>
              {(paisId) =>
                idsNacionales.has(paisId) && (
                  <form.Field name='comunaId'>
                    {(field) => (
                      <div className='space-y-1.5'>
                        <Label>
                          Comuna <span className='text-destructive'>*</span>
                        </Label>
                        <div className='flex items-center gap-2'>
                          <Combobox
                            className='flex-1'
                            options={comunas.map((c) => ({ value: String(c.id), label: c.nombre }))}
                            value={field.state.value ? String(field.state.value) : null}
                            onChange={(v) => {
                              const id = Number.parseInt(v, 10);
                              if (Number.isFinite(id)) field.handleChange(id);
                            }}
                            placeholder='Seleccionar comuna...'
                            searchPlaceholder='Buscar comuna...'
                          />
                          <ComunaQuickCreate
                            onCreated={(nueva) => {
                              queryClient.invalidateQueries({ queryKey: ['comunas'] });
                              form.setFieldValue('comunaId', nueva.id);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </form.Field>
                )
              }
            </form.Subscribe>

            <FormTextField name='direccion' label='Dirección' required placeholder='Calle, número, oficina...' />
            <FormCheckboxField
              name='esPorDefecto'
              label='Dirección predeterminada'
              description='Al marcarla, desmarca automáticamente cualquier otra dirección de este registro (RN-GEO-03).'
            />

            <div className='flex justify-end gap-2 pt-2'>
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type='submit' isLoading={isPending}>
                <Icons.check className='mr-1 h-4 w-4' />
                Guardar
              </Button>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
