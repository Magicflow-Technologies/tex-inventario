import {
  Tela,
  Rollo,
  MovimientoInventario,
  MovimientoDetalle,
  Pedido,
  PedidoDetalle,
  Perfil,
  Usuario,
} from '../types/inventory';

export const SEED_PERFILES: Perfil[] = [
  {
    id: '11111111-1111-4000-8000-000000000001',
    codigo: 'ADMIN',
    nombre: 'Administrador General',
    descripcion: 'Control total del sistema, almacén, POS, facturación, catálogo y gestión de usuarios/perfiles.',
    permisos: ['stock', 'pos', 'pedidos', 'trazabilidad', 'kardex', 'telas', 'usuarios', 'sql', 'ingreso', 'salida'],
    activo: true,
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: '11111111-2222-4000-8000-000000000002',
    codigo: 'ALMACEN',
    nombre: 'Jefe de Almacén',
    descripcion: 'Recepción de rollos (IN), despachos (OUT), impresión de etiquetas térmicas, trazabilidad y catálogo.',
    permisos: ['stock', 'trazabilidad', 'kardex', 'telas', 'ingreso', 'salida'],
    activo: true,
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: '11111111-3333-4000-8000-000000000003',
    codigo: 'VENTAS',
    nombre: 'Ejecutivo de Ventas (POS)',
    descripcion: 'Consulta de stock físico disponible, armado de órdenes de pedido y reserva de rollos en POS.',
    permisos: ['stock', 'pos', 'pedidos', 'trazabilidad'],
    activo: true,
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
  {
    id: '11111111-4444-4000-8000-000000000004',
    codigo: 'FACTURACION',
    nombre: 'Facturación y Despacho SUNAT',
    descripcion: 'Confirmación de Facturas/Boletas y Guías de Remisión SUNAT, liberación y despacho de pedidos.',
    permisos: ['stock', 'pedidos', 'kardex', 'trazabilidad', 'salida'],
    activo: true,
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
];

export const SEED_USUARIOS: Usuario[] = [
  {
    id: '22222222-1111-4000-8000-000000000001',
    perfil_id: '11111111-1111-4000-8000-000000000001',
    usuario: 'admin',
    password: '8Tex2026',
    nombre_completo: 'Administrador General',
    correo: 'admin@8tex.pe',
    telefono: '998 112 233',
    cargo: 'Gerente de Operaciones & Sistemas',
    activo: true,
    ultimo_acceso: null,
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z',
  },
];

export const SEED_TELAS: Tela[] = [];
export const SEED_ROLLOS: Rollo[] = [];
export const SEED_MOVIMIENTOS: MovimientoInventario[] = [];
export const SEED_MOVIMIENTO_DETALLES: MovimientoDetalle[] = [];
export const SEED_PEDIDOS: Pedido[] = [];
export const SEED_PEDIDO_DETALLES: PedidoDetalle[] = [];
