'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmpresaDatosForm } from '@/features/empresa/components/empresa-datos-form';
import { EmpresaLogoCard } from '@/features/empresa/components/empresa-logo-card';
import { IndicadoresForm } from '@/features/indicadores/components/indicadores-form';

// Configuración general (nov-2026): parámetros únicos del sistema en una sola
// página con viñetas, gobernada por el ItemMenu CONFIGURACION_GENERAL. ENE es
// una sola empresa, así que sus datos y su logo viven acá (en FAS, multi-
// empresa, están en el mantenedor de cada empresa). Las integraciones con API
// se sumarán como otra viñeta en su etapa.
export function ConfiguracionGeneralTabs() {
  return (
    <Tabs defaultValue='empresa' className='space-y-4'>
      <TabsList>
        <TabsTrigger value='empresa'>Empresa</TabsTrigger>
        <TabsTrigger value='logo'>Logo</TabsTrigger>
        <TabsTrigger value='indicadores'>Indicadores</TabsTrigger>
      </TabsList>
      <TabsContent value='empresa'>
        <EmpresaDatosForm />
      </TabsContent>
      <TabsContent value='logo'>
        <EmpresaLogoCard />
      </TabsContent>
      <TabsContent value='indicadores'>
        <IndicadoresForm />
      </TabsContent>
    </Tabs>
  );
}
