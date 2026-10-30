# 📦 MÓDULO INDEPENDIENTE DE GESTIÓN DE INVENTARIO (IN / OUT / STOCK)
**Proyecto:** Textiles Ocho Lukal E.I.R.L. (8tex)  
**Objetivo:** Control físico de inventario por rollos individuales (trazabilidad rollo a rollo), registro ágil de ingresos y salidas, y consulta de stock en tiempo real. Diseñado como módulo aislado para una posterior migración sin fricciones al ERP definitivo en Supabase/PostgreSQL.

---

## 1. Reglas de Negocio Fundamentales

1. **Unidad Física Base:** La empresa compra y vende telas **rollo por rollo**. Cada rollo físico es una entidad única e identificable (código de barra, QR o serie impresa).
2. **Dualidad Metros / Rollos:** El inventario no se controla únicamente como un valor escalar de metraje total; el stock real es la sumatoria del metraje de todos los rollos con estado `DISPONIBLE`.
3. **Desacoplamiento para Migración:** 
   - Se utiliza **UUIDv4** en todas las llaves primarias (`id`) para evitar colisiones al consolidar datos en la base final.
   - Las referencias a entidades externas (clientes, proveedores, documentos de SUNAT) se guardan como cadenas de texto en los movimientos para operar sin depender de los módulos comerciales en esta fase.

---

## 2. Esquema de Base de Datos (DDL PostgreSQL / Supabase)

```sql
-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. TABLA: telas (Catálogo Maestro)
-- ========================================================
CREATE TABLE telas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,             -- Ej. TEL-TIZZ-001
    nombre VARCHAR(150) NOT NULL,                    -- Ej. Casimir Tizziano
    color VARCHAR(80),                               -- Ej. Azul Marino 2004
    unidad_medida VARCHAR(20) DEFAULT 'METROS',      -- METROS, KILOS
    stock_minimo_alerta NUMERIC(10, 2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 2. TABLA: rollos (Unidades Físicas de Inventario)
-- ========================================================
CREATE TYPE estado_rollo_enum AS ENUM ('DISPONIBLE', 'VENDIDO', 'MERMA');

CREATE TABLE rollos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tela_id UUID NOT NULL REFERENCES telas(id) ON DELETE RESTRICT,
    codigo_rollo VARCHAR(60) UNIQUE NOT NULL,       -- Código de barra / QR (ej. ROL-2026-00012)
    metraje NUMERIC(10, 2) NOT NULL,                -- Metros exactos del rollo
    lote VARCHAR(60),                               -- Lote del proveedor / DUA
    ubicacion VARCHAR(100),                         -- Ej. Estante B - Nivel 2
    estado estado_rollo_enum DEFAULT 'DISPONIBLE' NOT NULL,
    fecha_ingreso TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_salida TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rollos_tela_estado ON rollos(tela_id, estado);
CREATE INDEX idx_rollos_codigo ON rollos(codigo_rollo);

-- ========================================================
-- 3. TABLA: movimientos_inventario (Cabecera IN / OUT)
-- ========================================================
CREATE TYPE tipo_movimiento_enum AS ENUM ('IN', 'OUT');

CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_movimiento tipo_movimiento_enum NOT NULL,  -- IN (Entrada) / OUT (Salida)
    motivo VARCHAR(50) NOT NULL,                    -- IN: COMPRA_LOCAL, IMPORTACION, AJUSTE_INICIAL
                                                    -- OUT: VENTA, MERMA, MUESTRA
    documento_referencia VARCHAR(100),              -- N° Factura SUNAT, Guía Remisión, DUA
    entidad_origen_destino VARCHAR(150),            -- Proveedor (en IN) o Cliente (en OUT)
    observaciones TEXT,
    registrado_por VARCHAR(100),                    -- Usuario responsable del registro
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================================
-- 4. TABLA: movimiento_detalles (Rollos por Movimiento)
-- ========================================================
CREATE TABLE movimiento_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movimiento_id UUID NOT NULL REFERENCES movimientos_inventario(id) ON DELETE CASCADE,
    rollo_id UUID NOT NULL REFERENCES rollos(id) ON DELETE RESTRICT,
    metraje_movimiento NUMERIC(10, 2) NOT NULL,     -- Metraje al momento de la operación
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_detalles_movimiento ON movimiento_detalles(movimiento_id);
CREATE INDEX idx_detalles_rollo ON movimiento_detalles(rollo_id);
```

---

## 3. Flujos de Trabajo Operativos

### Flujo A: Ingreso de Mercadería (IN)
1. Iniciar transacción en base de datos.
2. Insertar cabecera en `movimientos_inventario`:
   - `tipo_movimiento = 'IN'`
   - `motivo = 'COMPRA_LOCAL'` o `'IMPORTACION'`
   - `documento_referencia` (N° Guía / Factura)
   - `entidad_origen_destino` (Nombre del proveedor)
3. Por cada rollo recibido:
   - Insertar en `rollos` con `estado = 'DISPONIBLE'` y `tela_id` correspondiente.
   - Insertar en `movimiento_detalles` vinculando el `movimiento_id` con el `rollo_id`.
4. Confirmar transacción.

### Flujo B: Salida de Mercadería (OUT)
1. Iniciar transacción en base de datos.
2. Insertar cabecera en `movimientos_inventario`:
   - `tipo_movimiento = 'OUT'`
   - `motivo = 'VENTA'` o `'MERMA'`
   - `documento_referencia` (N° Pedido / Factura de Venta)
   - `entidad_origen_destino` (Nombre del cliente)
3. Por cada rollo a despachar:
   - Validar que el rollo esté en estado `'DISPONIBLE'`.
   - Actualizar el registro en `rollos`:
     - `estado = 'VENDIDO'` (o `'MERMA'`)
     - `fecha_salida = NOW()`
   - Insertar en `movimiento_detalles` asociando el rollo al movimiento.
4. Confirmar transacción.

---

## 4. Consultas Clave de Inventario (Queries SQL)

### Consulta 1: Stock consolidado por tela (Metros y Rollos disponibles)
```sql
SELECT 
    t.id AS tela_id,
    t.codigo,
    t.nombre,
    t.color,
    COUNT(r.id) AS total_rollos_disponibles,
    COALESCE(SUM(r.metraje), 0.00) AS total_metros_disponibles,
    t.stock_minimo_alerta,
    CASE 
        WHEN COALESCE(SUM(r.metraje), 0.00) <= t.stock_minimo_alerta THEN true 
        ELSE false 
    END AS alerta_reposicion
FROM telas t
LEFT JOIN rollos r ON t.id = r.tela_id AND r.estado = 'DISPONIBLE'
WHERE t.activo = true
GROUP BY t.id, t.codigo, t.nombre, t.color, t.stock_minimo_alerta
ORDER BY t.nombre ASC;
```

### Consulta 2: Búsqueda puntual y trazabilidad de un rollo (por código o QR)
```sql
SELECT 
    r.id,
    r.codigo_rollo,
    t.nombre AS tela,
    t.color,
    r.metraje,
    r.lote,
    r.ubicacion,
    r.estado,
    r.fecha_ingreso,
    r.fecha_salida
FROM rollos r
INNER JOIN telas t ON r.tela_id = t.id
WHERE r.codigo_rollo = :codigo_buscado;
```

### Consulta 3: Rollos disponibles para venta de una tela específica (Picking)
```sql
SELECT 
    id,
    codigo_rollo,
    metraje,
    lote,
    ubicacion,
    fecha_ingreso
FROM rollos
WHERE tela_id = :tela_id 
  AND estado = 'DISPONIBLE'
ORDER BY fecha_ingreso ASC; -- Salida sugerida por antigüedad (FIFO)
```

---

## 5. Guía de Migración al Sistema Central

Al momento de migrar este módulo al ERP final en Go + Supabase:
1. **Integridad Referencial:** Gracias al uso de UUIDs, las tablas `telas` y `rollos` pueden volcarse directamente sin conflictos de claves foráneas.
2. **Asociación de Entidades:** El campo `entidad_origen_destino` en `movimientos_inventario` se mapeará mediante un script simple a las tablas definitivas de `proveedores` o `clientes` por coincidencia de nombre o RUC.
3. **Módulo de Pedidos:** Al integrarse con el flujo comercial (`pedidos`), la tabla `pedido_detalles` tomará directamente los `rollo_id` liberados o reservados desde este esquema.