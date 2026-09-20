'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { ACOMODACION_LABELS, type Acomodacion, type ModeloTarifa } from '../types';

// Forma de fila "de UI": campos como string crudo del input, se validan y se
// convierten a TarifarioValorInput recién al armar el payload (RN-DIN-01: el
// backend exige decimal como string, nunca number — mantenerlo como string
// acá evita cualquier coerción intermedia).
export interface FilaValor {
  paxDesde: string;
  paxHasta: string; // vacío = abierto (solo válido en el último tramo)
  acomodacion: Acomodacion | '';
  valor: string;
  suplementoSingle: string;
}

export const FILA_VACIA: FilaValor = { paxDesde: '', paxHasta: '', acomodacion: '', valor: '', suplementoSingle: '' };

const ACOMODACIONES: Acomodacion[] = ['SINGLE', 'DOBLE', 'TWIN', 'TRIPLE'];

interface ValoresEditorProps {
  modeloTarifa: ModeloTarifa;
  valores: FilaValor[];
  onChange: (valores: FilaValor[]) => void;
}

// Editor polimórfico de TarifarioValor — no hay precedente de esta forma en
// el proyecto (Docs/mantenedores.md §7): la UI cambia por completo según
// `modeloTarifa`. Las validaciones de negocio (RN-TAR-02 solape/hueco,
// RN-TAR-04 cuadre de suplemento) las hace el backend al guardar; acá solo se
// valida la forma mínima (campos no vacíos) antes de enviar.
export function ValoresEditor({ modeloTarifa, valores, onChange }: ValoresEditorProps) {
  function actualizarFila(index: number, cambios: Partial<FilaValor>) {
    onChange(valores.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  }
  function agregarFila() {
    onChange([...valores, { ...FILA_VACIA }]);
  }
  function quitarFila(index: number) {
    onChange(valores.filter((_, i) => i !== index));
  }

  if (modeloTarifa === 'UNITARIO_PAX') {
    return (
      <div className='space-y-1.5'>
        <Label>
          Valor <span className='text-destructive'>*</span>
        </Label>
        <Input
          type='number'
          placeholder='Ej: 32000'
          value={valores[0]?.valor ?? ''}
          onChange={(e) => onChange([{ ...FILA_VACIA, valor: e.target.value }])}
          className='max-w-xs'
        />
      </div>
    );
  }

  if (modeloTarifa === 'ACOMODACION') {
    return (
      <div className='space-y-2'>
        <Label>
          Valores por acomodación <span className='text-destructive'>*</span>
        </Label>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acomodación</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Suplemento single</TableHead>
              <TableHead className='w-10' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {valores.map((fila, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Select value={fila.acomodacion} onValueChange={(v) => actualizarFila(i, { acomodacion: v as Acomodacion })}>
                    <SelectTrigger className='w-32'>
                      <SelectValue placeholder='Elegir...' />
                    </SelectTrigger>
                    <SelectContent>
                      {ACOMODACIONES.map((a) => (
                        <SelectItem key={a} value={a} disabled={valores.some((f, j) => j !== i && f.acomodacion === a)}>
                          {ACOMODACION_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input type='number' placeholder='Ej: 100000' value={fila.valor} onChange={(e) => actualizarFila(i, { valor: e.target.value })} className='w-32' />
                </TableCell>
                <TableCell>
                  <Input
                    type='number'
                    placeholder='Opcional'
                    value={fila.suplementoSingle}
                    onChange={(e) => actualizarFila(i, { suplementoSingle: e.target.value })}
                    className='w-32'
                  />
                </TableCell>
                <TableCell>
                  <Button type='button' variant='ghost' size='icon' onClick={() => quitarFila(i)} disabled={valores.length <= 1}>
                    <Icons.trash className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button type='button' variant='outline' size='sm' onClick={agregarFila}>
          <Icons.add className='mr-1 h-4 w-4' />
          Agregar acomodación
        </Button>
      </div>
    );
  }

  // TRAMO_PAX
  return (
    <div className='space-y-2'>
      <Label>
        Tramos de pasajeros <span className='text-destructive'>*</span>
      </Label>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Desde</TableHead>
            <TableHead>Hasta (vacío = sin tope, solo el último)</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead className='w-10' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {valores.map((fila, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input type='number' placeholder='1' value={fila.paxDesde} onChange={(e) => actualizarFila(i, { paxDesde: e.target.value })} className='w-24' />
              </TableCell>
              <TableCell>
                <Input type='number' placeholder='Sin tope' value={fila.paxHasta} onChange={(e) => actualizarFila(i, { paxHasta: e.target.value })} className='w-28' />
              </TableCell>
              <TableCell>
                <Input type='number' placeholder='Ej: 95000' value={fila.valor} onChange={(e) => actualizarFila(i, { valor: e.target.value })} className='w-32' />
              </TableCell>
              <TableCell>
                <Button type='button' variant='ghost' size='icon' onClick={() => quitarFila(i)} disabled={valores.length <= 1}>
                  <Icons.trash className='h-4 w-4' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type='button' variant='outline' size='sm' onClick={agregarFila}>
        <Icons.add className='mr-1 h-4 w-4' />
        Agregar tramo
      </Button>
    </div>
  );
}
