'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { QuickCreateTrigger } from '@/components/shared/quick-create-trigger';
import { porcentajeAFraccion } from '@/lib/porcentaje';
import { tiposDocumentoKeys } from '../queries';
import { tiposDocumentoService } from '../service';
import { FORMA_CALCULO_LABELS, type FormaCalculo, type TipoDocumento } from '../types';

const tipoDocumentoQuickSchema = z.object({
  codigo: z
    .string()
    .min(1, 'Requerido')
    .max(20)
    .trim()
    .toUpperCase()
    .regex(/^\S+$/, 'Sin espacios'),
  nombre: z.string().min(1, 'Requerido').max(80).trim(),
  formaCalculo: z.enum(['NINGUNO', 'IVA', 'RETENCION']),
  porcentajePct: z.coerce.number().min(0).max(100).default(0)
});

type TipoDocumentoQuickValues = z.infer<typeof tipoDocumentoQuickSchema>;

const FORMA_CALCULO_OPTIONS = (Object.keys(FORMA_CALCULO_LABELS) as FormaCalculo[]).map((value) => ({
  value,
  label: FORMA_CALCULO_LABELS[value]
}));

function TipoDocumentoQuickForm({ close, onCreated }: { close: () => void; onCreated: (tipoDocumento: TipoDocumento) => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: TipoDocumentoQuickValues) => {
      const { porcentajePct, formaCalculo, ...resto } = values;
      const porcentaje = formaCalculo === 'NINGUNO' ? 0 : Number(porcentajeAFraccion(String(porcentajePct)) || '0');
      return tiposDocumentoService.create({ ...resto, formaCalculo, porcentaje });
    },
    onSuccess: (nuevo) => {
      queryClient.invalidateQueries({ queryKey: tiposDocumentoKeys.all });
      toast.success(`Tipo de documento "${nuevo.nombre}" creado`);
      onCreated(nuevo);
      close();
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear el tipo de documento')
  });

  const form = useAppForm({
    defaultValues: { codigo: '', nombre: '', formaCalculo: 'NINGUNO', porcentajePct: 0 } as TipoDocumentoQuickValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: tipoDocumentoQuickSchema as any },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField, FormSelectField } = useFormFields<TipoDocumentoQuickValues>();

  return (
    <form.AppForm>
      <form.Form id='tipo-documento-quick-form' className='space-y-3'>
        <FormTextField name='codigo' label='Código' required placeholder='Ej: FACTURA_AFECTA' />
        <FormTextField name='nombre' label='Nombre' required placeholder='Ej: Factura afecta' />
        <FormSelectField
          name='formaCalculo'
          label='Forma de cálculo'
          required
          options={FORMA_CALCULO_OPTIONS}
          placeholder='Seleccionar...'
        />
        <form.Subscribe selector={(state) => state.values.formaCalculo}>
          {(formaCalculo) => (
            <FormTextField
              name='porcentajePct'
              label='Porcentaje (%)'
              type='number'
              placeholder='19'
              disabled={formaCalculo === 'NINGUNO'}
            />
          )}
        </form.Subscribe>
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={close}>
            Cancelar
          </Button>
          <Button type='submit' isLoading={mutation.isPending}>
            <Icons.check className='mr-1 h-4 w-4' />
            Crear tipo de documento
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export function TipoDocumentoQuickCreate({ onCreated }: { onCreated: (tipoDocumento: TipoDocumento) => void }) {
  return (
    <QuickCreateTrigger
      itemMenu='TIPOS_DOCUMENTO'
      titulo='Nuevo tipo de documento'
      descripcion='El tipo de documento queda disponible de inmediato en el selector.'
      triggerTitle='Crear nuevo tipo de documento'
    >
      {({ close }) => <TipoDocumentoQuickForm close={close} onCreated={onCreated} />}
    </QuickCreateTrigger>
  );
}
