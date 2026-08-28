'use client';

import { useQuery } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { PrefijoCodigoEditor } from '@/features/prefijos-codigo/components/prefijo-codigo-editor';
import { prefijosCodigoService } from '@/features/prefijos-codigo/service';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';

export default function PrefijosCodigoPage() {
  const { data, isPending } = useQuery({
    queryKey: ['prefijos-codigo'],
    queryFn: () => prefijosCodigoService.list()
  });

  return (
    <PageContainer
      pageTitle='Prefijos de código'
      pageDescription='Prefijo y dígitos usados para sugerir el código de cada maestro. Las entidades son fijas — no se crean ni eliminan acá.'
    >
      {isPending ? (
        <DataTableSkeleton columnCount={4} rowCount={9} />
      ) : (
        <div className='rounded-md border'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Entidad</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Prefijo</th>
                <th className='px-3 py-2 text-left font-medium text-muted-foreground'>Dígitos</th>
                <th className='w-24 px-3 py-2' />
              </tr>
            </thead>
            <tbody className='divide-y'>
              {(data ?? []).map((prefijo) => (
                <tr key={prefijo.id}>
                  <td className='px-3 py-2 font-medium'>{prefijo.entidad}</td>
                  <td className='px-3 py-2 font-mono'>{prefijo.prefijo}</td>
                  <td className='px-3 py-2'>{prefijo.digitos}</td>
                  <td className='px-3 py-2 text-right'>
                    <PrefijoCodigoEditor prefijo={prefijo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
