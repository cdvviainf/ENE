'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

export interface MultiComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiComboboxProps {
  options: MultiComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

/** Combobox con checkboxes para selección múltiple con búsqueda — listas
 * largas donde un grupo de badges como toggle no escala (ej. servicios). */
export function MultiCombobox({
  options,
  values,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados.',
  className
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const seleccionados = options.filter((o) => values.includes(o.value));

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  return (
    <div className='space-y-2'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className={cn('w-full justify-between font-normal', seleccionados.length === 0 && 'text-muted-foreground', className)}
          >
            <span className='truncate'>
              {seleccionados.length === 0 ? placeholder : `${seleccionados.length} seleccionado${seleccionados.length > 1 ? 's' : ''}`}
            </span>
            <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-(--radix-popover-trigger-width) p-0'>
          <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={option.disabled}
                    onSelect={() => toggle(option.value)}
                  >
                    <Checkbox checked={values.includes(option.value)} tabIndex={-1} className='mr-2 pointer-events-none' />
                    <span className='truncate'>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {seleccionados.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {seleccionados.map((o) => (
            <Badge key={o.value} variant='secondary' className='gap-1 pr-1'>
              {o.label}
              <button
                type='button'
                onClick={() => toggle(o.value)}
                className='hover:bg-muted-foreground/20 rounded-sm'
                aria-label={`Quitar ${o.label}`}
              >
                <Icons.close className='h-3 w-3' />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
