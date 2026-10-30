import { inventoryStore } from './inventoryStore';

export function generatePostgreSqlMigrationScript(): string {
  const { perfiles, usuarios, telas, rollos, movimientos, detalles, pedidos, pedidoDetalles } =
    inventoryStore.getRawData();

  const ddlHeader = `-- ========================================================
-- SCRIPT DE MIGRACIÓN: TEXTILES OCHO LUKAL E.I.R.L. (8tex)
-- ESQUEMA: ochotex_bd (Supabase VPS Autoalojado)
-- TABLAS: perfiles, usuarios, telas, rollos, movimientos_inventario,
--         movimiento_detalles, pedidos, pedido_detalles
-- Generado el: ${new Date().toISOString()}
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS ochotex_bd;

GRANT USAGE ON SCHEMA ochotex_bd TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ochotex_bd GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 1. TIPOS ENUM
DO $$ BEGIN
    CREATE TYPE ochotex_bd.estado_rollo_enum AS ENUM ('DISPONIBLE', 'RESERVADO', 'VENDIDO', 'MERMA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ochotex_bd.tipo_movimiento_enum AS ENUM ('IN', 'OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ochotex_bd.estado_pedido_enum AS ENUM ('PENDIENTE_FACTURACION', 'FACTURADO', 'ANULADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. SEGURIDAD Y ACCESO: PERFILES Y USUARIOS
CREATE TABLE IF NOT EXISTS ochotex_bd.perfiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(40) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '["stock","pos","pedidos","trazabilidad","kardex","telas","usuarios","sql"]'::jsonb,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ochotex_bd.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    perfil_id UUID NOT NULL REFERENCES ochotex_bd.perfiles(id) ON DELETE RESTRICT,
    usuario VARCHAR(60) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(150),
    telefono VARCHAR(40),
    cargo VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SISTEMA DE INVENTARIO FÍSICO Y POS
CREATE TABLE IF NOT EXISTS ochotex_bd.telas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    codigo_color VARCHAR(30),
    nombre VARCHAR(150) NOT NULL,
    color VARCHAR(80),
    linea VARCHAR(100),
    lote VARCHAR(60),
    ancho NUMERIC(5, 2) DEFAULT 1.50,
    metraje_estandar NUMERIC(10, 2) DEFAULT 50.00,
    unidad_medida VARCHAR(20) DEFAULT 'METROS',
    stock_minimo_alerta NUMERIC(10, 2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ochotex_bd.rollos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tela_id UUID NOT NULL REFERENCES ochotex_bd.telas(id) ON DELETE RESTRICT,
    codigo_rollo VARCHAR(60) UNIQUE NOT NULL,
    metraje NUMERIC(10, 2) NOT NULL,
    lote VARCHAR(60),
    ubicacion VARCHAR(100),
    estado ochotex_bd.estado_rollo_enum DEFAULT 'DISPONIBLE' NOT NULL,
    fecha_ingreso TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_salida TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ochotex_bd.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_movimiento ochotex_bd.tipo_movimiento_enum NOT NULL,
    motivo VARCHAR(50) NOT NULL,
    documento_referencia VARCHAR(100),
    entidad_origen_destino VARCHAR(150),
    observaciones TEXT,
    registrado_por VARCHAR(100),
    usuario_id UUID REFERENCES ochotex_bd.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS ochotex_bd.movimiento_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movimiento_id UUID NOT NULL REFERENCES ochotex_bd.movimientos_inventario(id) ON DELETE CASCADE,
    rollo_id UUID NOT NULL REFERENCES ochotex_bd.rollos(id) ON DELETE RESTRICT,
    metraje_movimiento NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ochotex_bd.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_pedido VARCHAR(50) UNIQUE NOT NULL,
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_documento VARCHAR(20),
    cliente_telefono VARCHAR(50),
    estado ochotex_bd.estado_pedido_enum DEFAULT 'PENDIENTE_FACTURACION' NOT NULL,
    total_rollos INTEGER NOT NULL,
    total_metros NUMERIC(10, 2) NOT NULL,
    total_importe NUMERIC(10, 2) NOT NULL,
    numero_factura VARCHAR(100),
    numero_guia VARCHAR(100),
    observaciones TEXT,
    registrado_por VARCHAR(100),
    usuario_id UUID REFERENCES ochotex_bd.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    facturado_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ochotex_bd.pedido_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES ochotex_bd.pedidos(id) ON DELETE CASCADE,
    rollo_id UUID NOT NULL REFERENCES ochotex_bd.rollos(id) ON DELETE RESTRICT,
    metraje NUMERIC(10, 2) NOT NULL,
    precio_metro NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

BEGIN;

`;

  const escapeSql = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return 'NULL';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  let perfilesInserts = `-- Inserción de Perfiles (${(perfiles || []).length} registros)\n`;
  if (perfiles && perfiles.length > 0) {
    perfilesInserts += `INSERT INTO ochotex_bd.perfiles (id, codigo, nombre, descripcion, permisos, activo, created_at, updated_at) VALUES\n`;
    perfilesInserts += perfiles
      .map(
        (p) =>
          `  (${escapeSql(p.id)}, ${escapeSql(p.codigo)}, ${escapeSql(p.nombre)}, ${escapeSql(
            p.descripcion
          )}, ${escapeSql(JSON.stringify(p.permisos || []))}::jsonb, ${p.activo}, ${escapeSql(
            p.created_at
          )}, ${escapeSql(p.updated_at)})`
      )
      .join(',\n');
    perfilesInserts += `\nON CONFLICT (id) DO NOTHING;\n\n`;
  }

  let usuariosInserts = `-- Inserción de Usuarios (${(usuarios || []).length} registros)\n`;
  if (usuarios && usuarios.length > 0) {
    usuariosInserts += `INSERT INTO ochotex_bd.usuarios (id, perfil_id, usuario, password, nombre_completo, correo, telefono, cargo, activo, ultimo_acceso, created_at, updated_at) VALUES\n`;
    usuariosInserts += usuarios
      .map(
        (u) =>
          `  (${escapeSql(u.id)}, ${escapeSql(u.perfil_id)}, ${escapeSql(u.usuario)}, ${escapeSql(
            u.password || '123456'
          )}, ${escapeSql(u.nombre_completo)}, ${escapeSql(u.correo)}, ${escapeSql(
            u.telefono
          )}, ${escapeSql(u.cargo)}, ${u.activo}, ${escapeSql(u.ultimo_acceso)}, ${escapeSql(
            u.created_at
          )}, ${escapeSql(u.updated_at)})`
      )
      .join(',\n');
    usuariosInserts += `\nON CONFLICT (id) DO NOTHING;\n\n`;
  }

  let telasInserts = `-- Inserción de Telas / Artículos (${telas.length} registros)\n`;
  if (telas.length > 0) {
    telasInserts += `INSERT INTO ochotex_bd.telas (id, codigo, codigo_color, nombre, color, linea, lote, ancho, metraje_estandar, unidad_medida, stock_minimo_alerta, activo, created_at, updated_at) VALUES\n`;
    telasInserts += telas
      .map(
        (t) =>
          `  (${escapeSql(t.id)}, ${escapeSql(t.codigo)}, ${escapeSql(t.codigo_color)}, ${escapeSql(
            t.nombre
          )}, ${escapeSql(t.color)}, ${escapeSql(t.linea || 'General')}, ${escapeSql(
            t.lote || 'LOT-STD'
          )}, ${Number(t.ancho) || 1.5}, ${Number(t.metraje_estandar) || 50.0}, ${escapeSql(
            t.unidad_medida
          )}, ${t.stock_minimo_alerta}, ${t.activo}, ${escapeSql(t.created_at)}, ${escapeSql(
            t.updated_at
          )})`
      )
      .join(',\n');
    telasInserts += `\nON CONFLICT (id) DO UPDATE SET\n  nombre = EXCLUDED.nombre,\n  stock_minimo_alerta = EXCLUDED.stock_minimo_alerta;\n\n`;
  }

  let rollosInserts = `-- Inserción de Rollos Físicos (${rollos.length} registros)\n`;
  if (rollos.length > 0) {
    rollosInserts += `INSERT INTO ochotex_bd.rollos (id, tela_id, codigo_rollo, metraje, lote, ubicacion, estado, fecha_ingreso, fecha_salida, created_at) VALUES\n`;
    rollosInserts += rollos
      .map(
        (r) =>
          `  (${escapeSql(r.id)}, ${escapeSql(r.tela_id)}, ${escapeSql(r.codigo_rollo)}, ${
            r.metraje
          }, ${escapeSql(r.lote)}, ${escapeSql(r.ubicacion)}, ${escapeSql(r.estado)}::ochotex_bd.estado_rollo_enum, ${escapeSql(
            r.fecha_ingreso
          )}, ${escapeSql(r.fecha_salida)}, ${escapeSql(r.created_at)})`
      )
      .join(',\n');
    rollosInserts += `\nON CONFLICT (id) DO UPDATE SET\n  estado = EXCLUDED.estado,\n  fecha_salida = EXCLUDED.fecha_salida;\n\n`;
  }

  let movimientosInserts = `-- Inserción de Cabeceras de Movimientos (${movimientos.length} registros)\n`;
  if (movimientos.length > 0) {
    movimientosInserts += `INSERT INTO ochotex_bd.movimientos_inventario (id, tipo_movimiento, motivo, documento_referencia, entidad_origen_destino, observaciones, registrado_por, created_at) VALUES\n`;
    movimientosInserts += movimientos
      .map(
        (m) =>
          `  (${escapeSql(m.id)}, ${escapeSql(m.tipo_movimiento)}::ochotex_bd.tipo_movimiento_enum, ${escapeSql(
            m.motivo
          )}, ${escapeSql(m.documento_referencia)}, ${escapeSql(
            m.entidad_origen_destino
          )}, ${escapeSql(m.observaciones)}, ${escapeSql(m.registrado_por)}, ${escapeSql(
            m.created_at
          )})`
      )
      .join(',\n');
    movimientosInserts += `\nON CONFLICT (id) DO NOTHING;\n\n`;
  }

  let detallesInserts = `-- Inserción de Detalles de Movimientos (${detalles.length} registros)\n`;
  if (detalles.length > 0) {
    detallesInserts += `INSERT INTO ochotex_bd.movimiento_detalles (id, movimiento_id, rollo_id, metraje_movimiento, created_at) VALUES\n`;
    detallesInserts += detalles
      .map(
        (d) =>
          `  (${escapeSql(d.id)}, ${escapeSql(d.movimiento_id)}, ${escapeSql(
            d.rollo_id
          )}, ${d.metraje_movimiento}, ${escapeSql(d.created_at)})`
      )
      .join(',\n');
    detallesInserts += `\nON CONFLICT (id) DO NOTHING;\n\n`;
  }

  let pedidosInserts = `-- Inserción de Pedidos (${(pedidos || []).length} registros)\n`;
  if (pedidos && pedidos.length > 0) {
    pedidosInserts += `INSERT INTO ochotex_bd.pedidos (id, codigo_pedido, cliente_nombre, cliente_documento, cliente_telefono, estado, total_rollos, total_metros, total_importe, numero_factura, numero_guia, observaciones, registrado_por, created_at, facturado_at) VALUES\n`;
    pedidosInserts += pedidos
      .map(
        (p) =>
          `  (${escapeSql(p.id)}, ${escapeSql(p.codigo_pedido)}, ${escapeSql(p.cliente_nombre)}, ${escapeSql(
            p.cliente_documento
          )}, ${escapeSql(p.cliente_telefono)}, ${escapeSql(p.estado)}::ochotex_bd.estado_pedido_enum, ${
            p.total_rollos
          }, ${p.total_metros}, ${p.total_importe}, ${escapeSql(p.numero_factura)}, ${escapeSql(
            p.numero_guia
          )}, ${escapeSql(p.observaciones)}, ${escapeSql(p.registrado_por)}, ${escapeSql(
            p.created_at
          )}, ${escapeSql(p.facturado_at)})`
      )
      .join(',\n');
    pedidosInserts += `\nON CONFLICT (id) DO NOTHING;\n\n`;
  }

  let pedDetallesInserts = `-- Inserción de Detalles de Pedidos (${(pedidoDetalles || []).length} registros)\n`;
  if (pedidoDetalles && pedidoDetalles.length > 0) {
    pedDetallesInserts += `INSERT INTO ochotex_bd.pedido_detalles (id, pedido_id, rollo_id, metraje, precio_metro, subtotal, created_at) VALUES\n`;
    pedDetallesInserts += pedidoDetalles
      .map(
        (pd) =>
          `  (${escapeSql(pd.id)}, ${escapeSql(pd.pedido_id)}, ${escapeSql(
            pd.rollo_id
          )}, ${pd.metraje}, ${pd.precio_metro}, ${pd.subtotal}, ${escapeSql(pd.created_at)})`
      )
      .join(',\n');
    pedDetallesInserts += `\nON CONFLICT (id) DO NOTHING;\n\n`;
  }

  const ddlFooter = `COMMIT;
NOTIFY pgrst, 'reload schema';
`;

  return (
    ddlHeader +
    perfilesInserts +
    usuariosInserts +
    telasInserts +
    rollosInserts +
    movimientosInserts +
    detallesInserts +
    pedidosInserts +
    pedDetallesInserts +
    ddlFooter
  );
}
