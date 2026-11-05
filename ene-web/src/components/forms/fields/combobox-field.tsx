'use client';

import { useStore } from '@tanstack/react-form';
import { Combobox } from '@/components/ui/combobox';
import { FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  useFieldContext,
  FormFieldSet,
  FormField,
  FormFieldError,
  createFormField
} from '@/components/ui/form-context';

type Option = { value: string; label: string };

interface ComboboxFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
}

/** Gemelo de SelectField pero con búsqueda (Combobox): para FK/listas largas. */
export function ComboboxField({
  label,
  description,
  required,
  options,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...'
}: ComboboxFieldProps) {
  const field = useFieldContext();
  const value = useStore(field.store, (s) => s.value) as string | null | undefined;

  return (
    <FormFieldSet>
      <FormField>
        <FieldLabel htmlFor={field.name}>
          {label}
          {required && ' *'}
        </FieldLabel>
        <Combobox
          options={options}
          value={value != null ? String(value) : null}
          onChange={(v) => field.handleChange(v)}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
        />
        {description && <FieldDescription>{description}</FieldDescription>}
      </FormField>
      <FormFieldError />
    </FormFieldSet>
  );
}

export const FormComboboxField = createFormField(ComboboxField);
