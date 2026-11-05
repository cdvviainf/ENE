'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { formatFechaCorta } from '@/lib/format';
import { empresaDetailOptions, empresaKeys } from '../queries';
import { empresaService } from '../service';

const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp';
// Mismo tope que el backend (LOGO_MAX_BYTES): se incrusta en cada PDF.
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

// RN-EMP-01: logo de la empresa emisora. Se guarda en la BD y encabeza todos
// los PDF (cabecera compartida); al reemplazarlo, los documentos siguientes
// salen con el nuevo sin tocar plantillas.
export function EmpresaLogoCard() {
  const queryClient = useQueryClient();
  const puedeEscribir = usePuedeEscribir('CONFIGURACION_GENERAL');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: empresa } = useQuery(empresaDetailOptions());

  // El logo se pide como blob (vía `api`, con cookies) y se muestra con un
  // objectURL. La key incluye `subidoEn` para re-pedirlo tras cada cambio.
  const { data: logoBlob } = useQuery({
    queryKey: ['empresa', 'logo', empresa?.logo?.subidoEn],
    queryFn: () => empresaService.getLogoBlob(),
    enabled: !!empresa?.logo,
    staleTime: 0
  });

  const tieneLogo = !!empresa?.logo;
  const logoUrl = useMemo(() => (logoBlob && tieneLogo ? URL.createObjectURL(logoBlob) : null), [logoBlob, tieneLogo]);
  // Libera el objectURL anterior al cambiar o desmontar.
  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  const limpiarInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => empresaService.uploadLogo(file),
    onSuccess: () => {
      toast.success('Logo actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: empresaKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al subir el logo'),
    onSettled: limpiarInput
  });

  const deleteMutation = useMutation({
    mutationFn: () => empresaService.deleteLogo(),
    onSuccess: () => {
      toast.success('Logo eliminado');
      queryClient.invalidateQueries({ queryKey: empresaKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar el logo')
  });

  function subir(file: File) {
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('El logo no puede superar 2 MB');
      limpiarInput();
      return;
    }
    uploadMutation.mutate(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Logo</CardTitle>
        <CardDescription>Aparece en la cabecera de todos los documentos PDF (cotización, orden de compra, etc.).</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center gap-6'>
          <div className='bg-muted flex h-28 w-40 items-center justify-center overflow-hidden rounded-md border p-2'>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt='Logo de la empresa' className='max-h-full max-w-full object-contain' />
            ) : (
              <Icons.media className='text-muted-foreground h-8 w-8' />
            )}
          </div>
          <div className='space-y-2'>
            {empresa?.logo ? (
              <p className='text-muted-foreground text-xs'>Actualizado el {formatFechaCorta(empresa.logo.subidoEn)}</p>
            ) : (
              <p className='text-muted-foreground text-xs'>Sin logo: los documentos salen solo con el nombre de la empresa.</p>
            )}
            {puedeEscribir && (
              <>
                <Label htmlFor='logo-archivo'>{empresa?.logo ? 'Reemplazar logo' : 'Subir logo'}</Label>
                <input
                  id='logo-archivo'
                  ref={fileInputRef}
                  type='file'
                  accept={LOGO_ACCEPT}
                  className='block text-sm'
                  disabled={uploadMutation.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) subir(file);
                  }}
                />
                <p className='text-muted-foreground text-xs'>PNG, JPG o WEBP · máximo 2 MB.</p>
                {empresa?.logo && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    isLoading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    <Icons.trash className='mr-2 h-4 w-4' />
                    Quitar logo
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
