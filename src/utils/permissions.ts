import { PermisoModulo, UsuarioConPerfil, Perfil } from '../types/inventory';
import { ActiveTab } from '../components/Navbar';

export interface PermisoDefinicion {
  id: PermisoModulo;
  label: string;
  descripcion: string;
  categoria: 'modulo' | 'operacion' | 'campo' | 'accion';
}

/**
 * Catálogo completo de permisos dinámicos del sistema:
 * - 'modulo': Pestañas principales de la barra de navegación
 * - 'operacion': Botones globales de Ingreso (IN) y Salida (OUT)
 * - 'campo': Visibilidad y edición de columnas/campos sensibles dentro de cada vista
 * - 'accion': Autorizaciones y acciones operativas internas
 */
export const CATALOGO_PERMISOS: PermisoDefinicion[] = [
  // 1. Módulos de Navegación (Barra Superior)
  {
    id: 'consulta_stock',
    label: 'Stock',
    descripcion: 'Consulta de stock por línea, código de artículo, colores y rollos disponibles.',
    categoria: 'modulo',
  },
  {
    id: 'stock',
    label: 'Stock General',
    descripcion: 'Tabla consolidada de inventario, alertas de reposición y gestión de rollos.',
    categoria: 'modulo',
  },
  {
    id: 'pos',
    label: 'POS (Punto de Venta)',
    descripcion: 'Carrito de compras, selección de rollos y generación de órdenes de pedido.',
    categoria: 'modulo',
  },
  {
    id: 'pedidos',
    label: 'Pedidos Pendientes',
    descripcion: 'Seguimiento de pedidos, aprobaciones, facturación y despacho.',
    categoria: 'modulo',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    descripcion: 'Directorio comercial de clientes (RUC, Razón Social, teléfonos y direcciones).',
    categoria: 'modulo',
  },
  {
    id: 'trazabilidad',
    label: 'Trazabilidad',
    descripcion: 'Consulta detallada e historial de cada rollo por código o lote.',
    categoria: 'modulo',
  },
  {
    id: 'kardex',
    label: 'Kárdex',
    descripcion: 'Historial general de movimientos de ingreso (IN), salida (OUT) y anulaciones.',
    categoria: 'modulo',
  },
  {
    id: 'telas',
    label: 'Catálogo',
    descripcion: 'Catálogo maestro de telas, colores, anchos y precios de lista.',
    categoria: 'modulo',
  },
  {
    id: 'usuarios',
    label: 'Usuarios & Perfiles',
    descripcion: 'Administración de cuentas de usuario, roles y permisos del sistema.',
    categoria: 'modulo',
  },

  // 2. Botones de Operación en Barra Superior
  {
    id: 'salida',
    label: 'Botón Salida (OUT)',
    descripcion: 'Permite registrar salidas de almacén (Venta directa, Merma o Muestra).',
    categoria: 'operacion',
  },
  {
    id: 'ingreso',
    label: 'Botón Ingresar (IN)',
    descripcion: 'Permite registrar ingresos de mercadería y descarga de rollos.',
    categoria: 'operacion',
  },

  // 3. Permisos Granulares de Campos (Visibilidad / Edición de Campos)
  {
    id: 'campo:ver_precio_lista',
    label: 'Ver Precio de Lista',
    descripcion: 'Muestra la columna y etiqueta de Precio de Lista en Stock y POS.',
    categoria: 'campo',
  },
  {
    id: 'campo:editar_precio_pos',
    label: 'Editar Precio en POS',
    descripcion: 'Permite modificar el precio por metro al armar un pedido en el POS.',
    categoria: 'campo',
  },
  {
    id: 'campo:ver_ubicacion_lote',
    label: 'Ver Ubicación y Lote',
    descripcion: 'Muestra la ubicación en almacén y lote/DUA de cada rollo físico.',
    categoria: 'campo',
  },
  {
    id: 'campo:ver_stock_minimo',
    label: 'Ver Stock Mínimo y Alertas',
    descripcion: 'Muestra el stock mínimo de alerta y avisos de reposición.',
    categoria: 'campo',
  },

  // 4. Permisos Granulares de Acciones Internas
  {
    id: 'accion:aprobar_j_ventas',
    label: 'Aprobar como J. Ventas',
    descripcion: 'Permite autorizar pedidos con rebaja de precio o a crédito en Jefatura de Ventas.',
    categoria: 'accion',
  },
  {
    id: 'accion:aprobar_creditos',
    label: 'Aprobar en Créditos',
    descripcion: 'Permite validar y aprobar pedidos en el área de Créditos y Cobranzas.',
    categoria: 'accion',
  },
  {
    id: 'accion:facturar_despachar',
    label: 'Facturar y Despachar',
    descripcion: 'Permite registrar Factura/Guía y confirmar el despacho de pedidos.',
    categoria: 'accion',
  },
  {
    id: 'accion:eliminar_registros',
    label: 'Eliminar Registros',
    descripcion: 'Permite eliminar rollos, variantes de tela, clientes o pedidos.',
    categoria: 'accion',
  },
];

/**
 * Permisos predeterminados por código de rol para garantizar que cada perfil
 * tenga sus módulos y campos correctamente configurados de forma dinámica.
 */
export const PERMISOS_POR_ROL_DEFECTO: Record<string, PermisoModulo[]> = {
  ADMIN: CATALOGO_PERMISOS.map((p) => p.id),
  VENTAS: [
    'consulta_stock',
    'pos',
    'pedidos',
    'clientes',
    'campo:ver_precio_lista',
    'campo:editar_precio_pos',
    'campo:ver_ubicacion_lote',
  ],
  ALMACEN: [
    'consulta_stock',
    'stock',
    'pedidos',
    'trazabilidad',
    'kardex',
    'telas',
    'ingreso',
    'salida',
    'campo:ver_ubicacion_lote',
    'campo:ver_stock_minimo',
    'accion:facturar_despachar',
  ],
  FACTURACION: [
    'consulta_stock',
    'stock',
    'pedidos',
    'clientes',
    'trazabilidad',
    'kardex',
    'salida',
    'campo:ver_precio_lista',
    'campo:ver_ubicacion_lote',
    'accion:aprobar_creditos',
    'accion:facturar_despachar',
  ],
};

/**
 * Normaliza la lista de permisos de un perfil para asegurar compatibilidad
 * con perfiles guardados anteriormente en la base de datos.
 */
export function resolvePerfilPermisos(perfil?: Perfil | null): PermisoModulo[] {
  if (!perfil) return [];
  const codigo = (perfil.codigo || '').trim().toUpperCase();

  // El rol ADMIN siempre tiene todos los permisos habilitados
  if (codigo === 'ADMIN') {
    return CATALOGO_PERMISOS.map((p) => p.id);
  }

  const rawPermisos = Array.isArray(perfil.permisos) ? [...perfil.permisos] : [];

  // Si es el perfil VENTAS y aún tenía la semilla antigua (['stock', 'pos', 'pedidos', 'trazabilidad']),
  // normalizarlo a los 4 módulos definidos para Ventas: Stock, POS, Pedidos Pendientes y Clientes.
  if (
    codigo === 'VENTAS' &&
    !rawPermisos.includes('consulta_stock') &&
    !rawPermisos.includes('clientes')
  ) {
    return [...PERMISOS_POR_ROL_DEFECTO.VENTAS];
  }

  // Si un perfil tiene 'stock' o 'pos', habilitar también 'consulta_stock' si no fue desmarcado explícitamente
  const hasExplicitConsulta = rawPermisos.includes('consulta_stock');
  if (!hasExplicitConsulta && (rawPermisos.includes('stock') || rawPermisos.includes('pos'))) {
    rawPermisos.unshift('consulta_stock');
  }

  // Si el perfil aún no tiene permisos de campos/acciones configurados en BD,
  // agregar los permisos de campo/acción predeterminados de su rol
  const hasAnyGranular = rawPermisos.some(
    (p) => p.startsWith('campo:') || p.startsWith('accion:')
  );
  if (!hasAnyGranular && PERMISOS_POR_ROL_DEFECTO[codigo]) {
    const defaultGranular = PERMISOS_POR_ROL_DEFECTO[codigo].filter(
      (p) => p.startsWith('campo:') || p.startsWith('accion:')
    );
    rawPermisos.push(...defaultGranular);
  }

  return Array.from(new Set(rawPermisos));
}

/**
 * Verifica dinámicamente si un usuario (o el perfil simulado) tiene un permiso específico
 * (ya sea un módulo, botón de operación, campo o acción).
 */
export function hasPermission(
  user: UsuarioConPerfil | null | undefined,
  permiso: PermisoModulo,
  perfilSimulado?: Perfil | null
): boolean {
  if (!user) return false;
  const perfilActivo = perfilSimulado || user.perfil;
  if (!perfilActivo) return false;

  const codigo = (perfilActivo.codigo || '').trim().toUpperCase();
  if (!perfilSimulado && (codigo === 'ADMIN' || user.usuario.toLowerCase() === 'admin')) {
    return true;
  }
  if (codigo === 'ADMIN') {
    return true;
  }

  const efectivos = resolvePerfilPermisos(perfilActivo);
  return efectivos.includes(permiso);
}

/**
 * Devuelve las pestañas de navegación (`ActiveTab`) permitidas para el usuario o perfil activo,
 * manteniendo el orden de la barra superior.
 */
export function getAllowedTabs(
  user: UsuarioConPerfil | null | undefined,
  perfilSimulado?: Perfil | null
): ActiveTab[] {
  const orderedTabs: Array<{ tab: ActiveTab; permiso: PermisoModulo }> = [
    { tab: 'consulta_stock', permiso: 'consulta_stock' },
    { tab: 'stock', permiso: 'stock' },
    { tab: 'pos', permiso: 'pos' },
    { tab: 'pedidos', permiso: 'pedidos' },
    { tab: 'clientes', permiso: 'clientes' },
    { tab: 'trazabilidad', permiso: 'trazabilidad' },
    { tab: 'kardex', permiso: 'kardex' },
    { tab: 'telas', permiso: 'telas' },
    { tab: 'usuarios', permiso: 'usuarios' },
  ];

  return orderedTabs
    .filter((item) => hasPermission(user, item.permiso, perfilSimulado))
    .map((item) => item.tab);
}

export function getPermissionLabel(permiso: string): string {
  const found = CATALOGO_PERMISOS.find((p) => p.id === permiso);
  return found ? found.label : permiso;
}
