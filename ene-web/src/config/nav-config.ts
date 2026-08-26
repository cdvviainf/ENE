import { NavGroup } from '@/types';

// Las rutas deben calzar exactamente con ItemMenu.ruta (ver ene-api/prisma/seed.ts)
// para que resolverNivelPorRuta (menu-acceso-context.tsx) filtre por el nivel
// real del perfil (RN-PER-01). Un ítem sin match acá pero con acceso en el
// backend simplemente no aparece en el menú.

export const navGroups: NavGroup[] = [
  {
    label: 'Inicio',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: 'dashboard',
        shortcut: ['d', 'd'],
        items: []
      }
    ]
  },
  {
    label: 'Comercial',
    items: [
      {
        title: 'Cotizaciones',
        url: '/cotizaciones',
        icon: 'cotizaciones',
        items: []
      }
    ]
  },
  {
    label: 'Operaciones',
    items: [
      {
        title: 'Órdenes de Trabajo',
        url: '/ordenes-trabajo',
        icon: 'ordenesTrabajo',
        items: []
      },
      {
        title: 'Órdenes de Compra',
        url: '/ordenes-compra',
        icon: 'ordenesCompra',
        items: []
      }
    ]
  },
  {
    label: 'Administración',
    items: [
      {
        title: 'Facturación',
        url: '/facturacion',
        icon: 'facturacion',
        items: []
      },
      {
        title: 'Cobros y pagos',
        url: '/cobros',
        icon: 'cobros',
        items: []
      }
    ]
  },
  {
    label: 'Configuración',
    items: [
      {
        title: 'Mantenedores',
        url: '/config',
        icon: 'settings',
        items: []
      },
      {
        title: 'Usuarios y perfiles',
        url: '/config/usuarios',
        icon: 'teams',
        items: []
      }
    ]
  }
];
