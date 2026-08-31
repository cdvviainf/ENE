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
        items: [
          {
            title: 'Clientes',
            url: '/config/clientes',
            items: []
          },
          {
            title: 'Grupos',
            url: '/config/grupos',
            items: []
          },
          {
            title: 'Proveedores',
            url: '/config/proveedores',
            items: []
          },
          {
            title: 'Servicios',
            url: '/config/servicios',
            items: []
          },
          {
            title: 'Zonas',
            url: '/config/zonas',
            items: []
          },
          {
            title: 'Tipos de servicio',
            url: '/config/tipos-servicio',
            items: []
          },
          {
            title: 'Formas de pago',
            url: '/config/formas-pago',
            items: []
          },
          {
            title: 'Condiciones de pago',
            url: '/config/condiciones-pago',
            items: []
          },
          {
            title: 'Países',
            url: '/config/paises',
            items: []
          },
          {
            title: 'Regiones',
            url: '/config/regiones',
            items: []
          },
          {
            title: 'Provincias',
            url: '/config/provincias',
            items: []
          },
          {
            title: 'Comunas',
            url: '/config/comunas',
            items: []
          },
          {
            title: 'Prefijos de código',
            url: '/config/prefijos-codigo',
            items: []
          }
        ]
      },
      {
        title: 'Usuarios y perfiles',
        url: '/config/usuarios',
        icon: 'teams',
        items: [
          {
            title: 'Usuarios',
            url: '/config/usuarios',
            items: []
          },
          {
            title: 'Perfiles',
            url: '/config/usuarios/perfiles',
            items: []
          }
        ]
      }
    ]
  }
];
