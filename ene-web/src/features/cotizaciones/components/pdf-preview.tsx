'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cotizacionesService, previewUrl } from '../service';
import type { IdiomaDocumento, ModalidadDocumento } from '../types';

// RN-COT-06: idioma (es/en) y modalidad (total/desglosado). RN-COT-07: la
// modalidad desglosada muestra la venta por ítem, nunca costo ni margen.
export function PdfPreview({
  cotizacionId,
  idiomaDefault,
  // Firma del contenido de la versión vigente: al cambiar (tras un auto-guardado)
  // fuerza la recarga del iframe para que el documento muestre los datos frescos.
  refreshKey
}: {
  cotizacionId: number;
  idiomaDefault: IdiomaDocumento;
  refreshKey?: string;
}) {
  const [idioma, setIdioma] = useState<IdiomaDocumento>(idiomaDefault);
  const [modalidad, setModalidad] = useState<ModalidadDocumento>('total');

  const descargar = useMutation({
    mutationFn: () => cotizacionesService.emitirPdf('cotizacion', cotizacionId, idioma, modalidad),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion_${cotizacionId}_${idioma}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => toast.error(e.message || 'No se pudo generar el PDF')
  });

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>Documento</CardTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex items-center gap-1.5'>
            <Label className='text-xs'>Idioma</Label>
            <Select value={idioma} onValueChange={(v) => setIdioma(v as IdiomaDocumento)}>
              <SelectTrigger className='h-8 w-28'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='es'>Español</SelectItem>
                <SelectItem value='en'>Inglés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex items-center gap-1.5'>
            <Label className='text-xs'>Modalidad</Label>
            <Select value={modalidad} onValueChange={(v) => setModalidad(v as ModalidadDocumento)}>
              <SelectTrigger className='h-8 w-36'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='total'>Valor total</SelectItem>
                <SelectItem value='desglosado'>Desglosado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size='sm' onClick={() => descargar.mutate()} isLoading={descargar.isPending}>
            <Icons.download className='mr-2 h-4 w-4' />
            Descargar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <iframe
          key={`${idioma}-${modalidad}-${refreshKey ?? ''}`}
          title='Vista previa de la cotización'
          src={previewUrl(cotizacionId, idioma, modalidad)}
          className='h-[600px] w-full rounded-md border bg-white'
        />
      </CardContent>
    </Card>
  );
}
