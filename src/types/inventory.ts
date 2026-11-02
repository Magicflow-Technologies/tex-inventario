/**
 * Tipos y modelos basados en la especificación DDL de PostgreSQL / Supabase
 * Proyecto: Textiles Ocho Lukal E.I.R.L. (8tex)
 * Arquitectura desacoplada: Módulo de Inventario Físico + Módulo de Pedidos y POS
 */

export type EstadoRollo = 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'MERMA';

export type TipoMovimiento = 'IN' | 'OUT';

export type MotivoMovimientoIN = 'COMPRA_LOCAL' | 'IMPORTACION' | 'AJUSTE_INICIAL';
export type MotivoMovimientoOUT = 'VENTA' | 'MERMA' | 'MUESTRA';
export type MotivoMovimiento = MotivoMovimientoIN | MotivoMovimientoOUT;

export type UnidadMedida = 'METROS' | 'KILOS';

export type PermisoModulo =
  | 'stock'
  | 'pos'
  | 'pedidos'
  | 'trazabilidad'
  | 'kardex'
  | 'telas'
  | 'usuarios'
  | 'sql'
  | 'ingreso'
  | 'salida';

/** TABLA: ochotex_bd.perfiles (Roles y Permisos del Sistema) */
export interface Perfil {
  id: string; // UUIDv4
  codigo: string; // Ej. ADMIN, ALMACEN, VENTAS, FACTURACION
  nombre: string;
  descripcion: string;
  permisos: PermisoModulo[];
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** TABLA: ochotex_bd.usuarios (Usuarios de acceso al sistema) */
export interface Usuario {
  id: string; // UUIDv4
  perfil_id: string; // UUID FK -> perfiles(id)
  usuario: string; // Login username
  password?: string;
  nombre_completo: string;
  correo?: string;
  telefono?: string;
  cargo?: string;
  activo: boolean;
  ultimo_acceso?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsuarioConPerfil extends Usuario {
  perfil: Perfil;
}

/** 1. TABLA: telas (Catálogo Maestro)
 * Nota de negocio: Un mismo código de artículo (`codigo`, ej. "C-900") puede registrarse
 * múltiples veces para distintas variantes de `codigo_color` (unicidad compuesta: codigo + codigo_color).
 * El `metraje` y `lote` pertenecen exclusivamente a cada unidad física en la tabla `rollos`.
 */
export interface Tela {
  id: string; // UUIDv4
  codigo: string; // Código de artículo: permite números y letras (ej. C-900, ART-TIZZ-001)
  nombre: string; // Nombre comercial del artículo (ej. Casimir Tizziano Super 120s)
  codigo_color: string; // Código Color: permite número (ej. "2004")
  color: string; // Descripción del color (ej. "Azul Marino")
  linea: string; // Línea: texto (ej. "Sastrería Formal", "Industrial", "Camisería")
  ancho: number; // Ancho: unidad de medida metros (ej. 1.50)
  unidad_medida: UnidadMedida; // 'METROS'
  stock_minimo_alerta: number;
  activo: boolean;
  created_at: string; // Fecha de registro automático
  updated_at: string;
  // Campos opcionales solo por retrocompatibilidad de lectura histórica
  lote?: string | null;
  metraje_estandar?: number | null;
}

/** 2. TABLA: rollos (Unidades Físicas de Inventario)
 * Cada rollo físico posee su propio metraje exacto y su propio lote / DUA.
 */
export interface Rollo {
  id: string; // UUIDv4
  tela_id: string; // UUID FK -> telas(id)
  codigo_rollo: string; // Código de barra / QR (ej. ROL-2026-00012)
  metraje: number; // Metros exactos del rollo físico
  lote: string; // Lote del proveedor / DUA propio de este rollo
  ubicacion: string; // Ej. Estante B - Nivel 2
  estado: EstadoRollo;
  fecha_ingreso: string; // TIMESTAMPTZ
  fecha_salida: string | null; // TIMESTAMPTZ
  created_at: string;
}

/** 3. TABLA: movimientos_inventario (Cabecera IN / OUT) */
export interface MovimientoInventario {
  id: string; // UUIDv4
  tipo_movimiento: TipoMovimiento;
  motivo: MotivoMovimiento | string;
  documento_referencia: string; // N° Factura SUNAT, Guía Remisión, DUA
  entidad_origen_destino: string; // Proveedor (en IN) o Cliente (en OUT)
  observaciones: string;
  registrado_por: string; // Usuario responsable del registro
  created_at: string;
}

/** 4. TABLA: movimiento_detalles (Rollos por Movimiento) */
export interface MovimientoDetalle {
  id: string; // UUIDv4
  movimiento_id: string; // UUID FK -> movimientos_inventario(id)
  rollo_id: string; // UUID FK -> rollos(id)
  metraje_movimiento: number; // Metraje al momento de la operación
  created_at: string;
}

// ==========================================
// MÓDULO DESACOPLADO: PEDIDOS & PUNTO DE VENTA (POS)
// ==========================================

export type EstadoPedido = 'PENDIENTE_FACTURACION' | 'FACTURADO' | 'ANULADO';

/** 5. TABLA: pedidos (Órdenes de Pedido antes de facturar) */
export interface Pedido {
  id: string; // UUIDv4
  codigo_pedido: string; // Ej. PED-2026-00001
  cliente_nombre: string;
  cliente_documento: string; // RUC o DNI
  cliente_telefono?: string;
  estado: EstadoPedido;
  total_rollos: number;
  total_metros: number;
  total_importe: number; // en Soles (S/.)
  numero_factura?: string | null; // N° Factura o Boleta SUNAT
  numero_guia?: string | null; // N° Guía de Remisión
  observaciones?: string;
  registrado_por: string;
  created_at: string;
  facturado_at?: string | null;
}

/** 6. TABLA: pedido_detalles (Rollos asignados a la orden) */
export interface PedidoDetalle {
  id: string; // UUIDv4
  pedido_id: string; // UUID FK -> pedidos(id)
  rollo_id: string; // UUID FK -> rollos(id)
  metraje: number;
  precio_metro: number; // Precio acordado por metro
  subtotal: number;
  created_at: string;
}

/** Consulta 1: Stock consolidado por tela (Metros y Rollos disponibles) */
export interface StockConsolidadoTela {
  tela_id: string;
  codigo: string; // Código de artículo
  nombre: string;
  codigo_color: string; // Código numérico de color
  color: string;
  linea: string; // Línea
  ancho: number; // Ancho en metros
  unidad_medida: UnidadMedida;
  total_rollos_disponibles: number;
  total_metros_disponibles: number;
  total_rollos_reservados: number;
  total_metros_reservados: number;
  stock_minimo_alerta: number;
  alerta_reposicion: boolean;
}

/** Rollo enriquecido con datos de su tela */
export interface RolloConTela extends Rollo {
  tela_nombre: string;
  tela_codigo: string;
  tela_codigo_color: string;
  tela_color: string;
  tela_linea: string;
  tela_ancho: number;
  unidad_medida: UnidadMedida;
}

/** Movimiento completo con sus detalles de rollos */
export interface MovimientoCompleto extends MovimientoInventario {
  detalles: Array<{
    id: string;
    rollo_id: string;
    codigo_rollo: string;
    metraje_movimiento: number;
    tela_nombre: string;
    tela_color: string;
    ubicacion?: string;
  }>;
  total_rollos: number;
  total_metraje: number;
}

/** Pedido completo con sus rollos y datos para visualización e impresión */
export interface PedidoCompleto extends Pedido {
  detalles: Array<{
    id: string;
    rollo_id: string;
    codigo_rollo: string;
    metraje: number;
    precio_metro: number;
    subtotal: number;
    tela_nombre: string;
    tela_color: string;
    lote?: string;
    ubicacion?: string;
  }>;
}
