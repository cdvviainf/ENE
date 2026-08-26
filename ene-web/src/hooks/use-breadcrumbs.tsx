'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// Mapeo de rutas a título de breadcrumb. Debe reflejar la estructura de
// route group (app) de CLAUDE.md §4.
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }],
  '/cotizaciones': [{ title: 'Cotizaciones', link: '/cotizaciones' }],
  '/ordenes-trabajo': [{ title: 'Órdenes de Trabajo', link: '/ordenes-trabajo' }],
  '/ordenes-compra': [{ title: 'Órdenes de Compra', link: '/ordenes-compra' }],
  '/facturacion': [{ title: 'Facturación', link: '/facturacion' }],
  '/cobros': [{ title: 'Cobros y pagos', link: '/cobros' }],
  '/config': [{ title: 'Mantenedores', link: '/config' }],
  '/config/usuarios': [
    { title: 'Mantenedores', link: '/config' },
    { title: 'Usuarios y perfiles', link: '/config/usuarios' }
  ]
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
