'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePuedeEscribir } from '@/hooks/use-item-acceso';
import { formatFechaCorta } from '@/lib/format';
import { EstadoTarifaBadge } from './estado-tarifa-badge';
import type { ServicioConTarifa, TarifaVentaResumen } from '../types';

const MODELO_LABELS: Record<ServicioConTarifa['modeloTarifa'], string> = {
  TRAMO_PAX: 'Tramo pax',
  ACOMODACION: 'Acomodación',
  UNITARIO_PAX: 'Unitario pax'
};

// Un servicio puede tener una tarifa vigente por moneda (RN-TVE-03): las
// columnas de tarifa muestran una fila por moneda, alineadas entre sí.
function PorMoneda({ tarifas, render }: { tarifas: TarifaVentaResumen[]; render: (t: TarifaVentaResumen) => React.ReactNode }) {
  if (tarifas.length === 0) return <span className='text-muted-foreground text-sm'>—</span>;
  return (
    <div className='flex flex-col gap-1.5'>
      {tarifas.map((t) => (
        <div key={t.id} className='flex h-6 items-center text-sm'>
          {render(t)}
        </div>
      ))}
    </div>
  );
}

function AccionesServicio({ servicio }: { servicio: ServicioConTarifa }) {
  const puedeEscribir = usePuedeEscribir('TARIFAS_VENTA');
  const primera = servicio.tarifas[0];
  return (
    <div className='flex items-center justify-end gap-1'>
      {primera && (
        <Button variant='ghost' size='icon' asChild title='Ver tarifas del servicio'>
          <Link href={`/config/tarifas-venta/${primera.id}`}>
            <Icons.arrowRight className='h-4 w-4' />
          </Link>
        </Button>
      )}
      {puedeEscribir && (
        <Button variant='outline' size='sm' asChild>
          <Link href={`/config/tarifas-venta/nuevo?servicioId=${servicio.id}`}>
            <Icons.add className='mr-1 h-4 w-4' />
            Agregar tarifa
          </Link>
        </Button>
      )}
    </div>
  );
}

export const serviciosTarifaColumns: ColumnDef<ServicioConTarifa>[] = [
  {
    id: 'codigo',
    accessorKey: 'codigo',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Código' />,
    cell: ({ cell }) => <span className='font-mono text-xs font-semibold'>{cell.getValue<string>()}</span>,
    size: 90
  },
  {
    id: 'servicio',
    header: 'Servicio',
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>{row.original.nombre}</span>
        <span className='text-muted-foreground text-xs'>
          {row.original.tipoServicio.nombre}
          {row.original.zona ? ` · ${row.original.zona.nombre}` : ''}
        </span>
      </div>
    )
  },
  {
    id: 'modelo',
    header: 'Modelo',
    cell: ({ row }) => <Badge variant='outline'>{MODELO_LABELS[row.original.modeloTarifa]}</Badge>
  },
  {
    id: 'moneda',
    header: 'Moneda',
    size: 80,
    cell: ({ row }) => <PorMoneda tarifas={row.original.tarifas} render={(t) => <Badge variant='outline'>{t.moneda}</Badge>} />
  },
  {
    id: 'estado',
    header: 'Estado',
    size: 110,
    cell: ({ row }) =>
      row.original.tarifas.length === 0 ? (
        <EstadoTarifaBadge estado='SIN_TARIFA' />
      ) : (
        <PorMoneda tarifas={row.original.tarifas} render={(t) => <EstadoTarifaBadge estado={t.estado} />} />
      )
  },
  {
    id: 'inicio',
    header: 'Inicio',
    size: 100,
    cell: ({ row }) => <PorMoneda tarifas={row.original.tarifas} render={(t) => formatFechaCorta(t.vigenciaDesde)} />
  },
  {
    id: 'termino',
    header: 'Término',
    size: 100,
    cell: ({ row }) => (
      <PorMoneda
        tarifas={row.original.tarifas}
        render={(t) => (t.vigenciaHasta ? formatFechaCorta(t.vigenciaHasta) : <span className='text-muted-foreground'>Sin término</span>)}
      />
    )
  },
  {
    id: 'actions',
    size: 190,
    cell: ({ row }) => <AccionesServicio servicio={row.original} />
  }
];
