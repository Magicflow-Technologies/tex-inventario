import React, { useState } from 'react';
import { RolloConTela } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  ScanBarcode,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  MapPin,
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Tag,
  Palette,
  Layers,
  Ruler,
  Trash2,
} from 'lucide-react';

interface TrazabilidadRolloViewProps {
  initialCodigoRollo?: string;
  onVerEtiqueta: (rollo: RolloConTela) => void;
  onOpenSalidaConRollo?: (rolloId: string) => void;
}

export const TrazabilidadRolloView: React.FC<TrazabilidadRolloViewProps> = ({
  initialCodigoRollo = '',
  onVerEtiqueta,
}) => {
  const [searchCode, setSearchCode] = useState(initialCodigoRollo || 'ROL-2026-00001');
  const allRollos = inventoryStore.getRollosConTela();

  // Ejecutar Consulta 2
  const { rollo, movimientoIngreso, movimientoSalida, pedidoAsociado } =
    inventoryStore.getRolloTrazabilidad(searchCode);

  const handleSelectQuickRollo = (code: string) => {
    setSearchCode(code);
  };

  const handleDeleteRollo = (r: RolloConTela) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el rollo físico ${r.codigo_rollo} (${r.tela_nombre} - ${r.metraje.toFixed(2)} m) del inventario?`
      )
    )
      return;
    try {
      inventoryStore.deleteRollo(r.id);
      const remaining = inventoryStore.getRollosConTela();
      setSearchCode(remaining.length > 0 ? remaining[0].codigo_rollo : '');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar rollo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-[#1a73e8] text-xs font-semibold mb-2">
          <ScanBarcode className="w-3.5 h-3.5" />
          <span>Consulta Individual (Consulta 2)</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Trazabilidad Rollo a Rollo (UUIDv4)
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Búsqueda puntual de cada rollo físico. Cada pieza es una entidad física única, verificable por código de barras o QR con su historial completo de ingresos, reservas y facturación.
        </p>
      </div>

      {/* Buscador & Scanner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <ScanBarcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1a73e8]" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Escanear código de barras o ingresar código (ej. ROL-2026-00001)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all shadow-inner"
          />
        </div>

        {/* Acceso Rápido a Rollos Existentes */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs pt-1">
          <span className="text-slate-500 whitespace-nowrap font-medium">Rollos activos:</span>
          {allRollos.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectQuickRollo(r.codigo_rollo)}
              className={`px-3 py-1.5 rounded-lg font-mono transition-all whitespace-nowrap border cursor-pointer ${
                r.codigo_rollo.toUpperCase() === searchCode.trim().toUpperCase()
                  ? 'bg-[#1a73e8] text-white border-[#1a73e8] font-bold shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              {r.codigo_rollo} ({r.estado === 'DISPONIBLE' ? 'Disp.' : r.estado})
            </button>
          ))}
        </div>
      </div>

      {/* Resultado de Consulta 2 */}
      {!rollo ? (
        <div className="border border-slate-200 rounded-2xl p-12 text-center bg-white shadow-sm space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <ScanBarcode className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Rollo no encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No se encontró ningún rollo con el código <span className="font-mono font-bold text-[#1a73e8]">{searchCode}</span>.
            Selecciona uno de los rollos de la barra superior o realiza un nuevo ingreso de mercadería.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Ficha Técnica del Rollo */}
          <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs font-mono text-slate-400 mb-1">
                  ID Físico Único: <span className="text-slate-600 font-semibold">{rollo.id}</span>
                </div>
                <h2 className="text-2xl font-bold font-mono tracking-tight text-slate-900 flex items-center gap-3">
                  <span>{rollo.codigo_rollo}</span>
                </h2>
                <div className="text-base text-slate-700 font-semibold mt-1">
                  {rollo.tela_nombre} · <span className="text-[#1a73e8]">{rollo.tela_color}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {rollo.estado === 'DISPONIBLE' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>DISPONIBLE EN STOCK</span>
                  </span>
                )}
                {rollo.estado === 'RESERVADO' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>RESERVADO (EN PEDIDO)</span>
                  </span>
                )}
                {rollo.estado === 'VENDIDO' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>DESPACHADO / FACTURADO</span>
                  </span>
                )}
                {rollo.estado === 'MERMA' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>DADO DE BAJA (MERMA)</span>
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVerEtiqueta(rollo)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Imprimir Etiqueta</span>
                  </button>
                  <button
                    onClick={() => handleDeleteRollo(rollo)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    title="Eliminar este rollo del inventario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de atributos del rollo según especificaciones */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">Metraje Exacto</div>
                <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                  {rollo.metraje.toFixed(2)} m
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">Lote / DUA</div>
                <div className="text-sm font-semibold text-slate-800 font-mono mt-1 truncate">
                  {rollo.lote || 'N/A'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">Ubicación Física</div>
                <div className="text-sm font-semibold text-slate-800 mt-1 truncate flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
                  <span>{rollo.ubicacion || 'Almacén Central'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 font-medium">Cód. Artículo</div>
                <div className="text-sm font-semibold text-slate-800 font-mono mt-1">
                  {rollo.tela_codigo}
                </div>
              </div>
            </div>

            {/* Campos de especificación técnica del artículo */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Especificación Técnica del Artículo:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500 block">Código Color (numérico):</span>
                  <strong className="text-slate-900 font-mono">{rollo.tela_codigo_color || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Línea de Tela:</span>
                  <strong className="text-slate-900">{rollo.tela_linea || 'Central'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Ancho Nominal:</span>
                  <strong className="text-slate-900 font-mono">{rollo.tela_ancho ? `${rollo.tela_ancho.toFixed(2)} m` : '1.50 m'}</strong>
                </div>
              </div>
            </div>

            {/* Fechas de ciclo de vida */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha de Registro / Ingreso:</span>
                </span>
                <span className="font-mono text-slate-900 font-semibold">
                  {new Date(rollo.fecha_ingreso).toLocaleString('es-PE', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700 border-t border-slate-200 pt-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha de Salida / Facturación:</span>
                </span>
                <span className="font-mono text-slate-900 font-semibold">
                  {rollo.fecha_salida
                    ? new Date(rollo.fecha_salida).toLocaleString('es-PE', {
                        dateStyle: 'full',
                        timeStyle: 'medium',
                      })
                    : 'Aún en almacén (No despachado)'}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Movimientos Asociados (Trazabilidad IN / OUT) */}
          <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-white p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1a73e8]" />
              <span>Trazabilidad de Movimientos (Kárdex Rollo)</span>
            </h3>

            {/* Evento IN */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a73e8]">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>MOVIMIENTO DE INGRESO (IN)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {movimientoIngreso ? new Date(movimientoIngreso.created_at).toLocaleDateString('es-PE') : ''}
                </span>
              </div>

              {movimientoIngreso ? (
                <div className="text-xs space-y-1 text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-500">Motivo:</span>{' '}
                    <strong className="text-slate-900 font-mono">{movimientoIngreso.motivo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Documento SUNAT:</span>{' '}
                    <span className="font-mono text-slate-900 font-semibold">{movimientoIngreso.documento_referencia}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Proveedor / Origen:</span>{' '}
                    <span className="text-slate-900">{movimientoIngreso.entidad_origen_destino}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Registrado por:</span>{' '}
                    <span className="text-slate-600">{movimientoIngreso.registrado_por}</span>
                  </div>
                  {movimientoIngreso.observaciones && (
                    <div className="text-slate-500 italic pt-1 border-t border-slate-200/80">
                      "{movimientoIngreso.observaciones}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Ingreso histórico o inventario base inicial.
                </div>
              )}
            </div>

            {/* Evento OUT */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>MOVIMIENTO DE SALIDA (OUT)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {movimientoSalida ? new Date(movimientoSalida.created_at).toLocaleDateString('es-PE') : ''}
                </span>
              </div>

              {movimientoSalida ? (
                <div className="text-xs space-y-1 text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-500">Motivo:</span>{' '}
                    <strong className="text-slate-900 font-mono">{movimientoSalida.motivo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Documento SUNAT:</span>{' '}
                    <span className="font-mono text-slate-900 font-semibold">{movimientoSalida.documento_referencia}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cliente / Destino:</span>{' '}
                    <span className="text-slate-900">{movimientoSalida.entidad_origen_destino}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Despachado por:</span>{' '}
                    <span className="text-slate-600">{movimientoSalida.registrado_por}</span>
                  </div>
                  {movimientoSalida.observaciones && (
                    <div className="text-slate-500 italic pt-1 border-t border-slate-200/80">
                      "{movimientoSalida.observaciones}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  No registra salida física todavía. El rollo continúa en stock activo.
                </div>
              )}
            </div>

            {/* Orden de Pedido Asociada (POS) */}
            {pedidoAsociado && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-amber-700" />
                    <span>ORDEN DE PEDIDO ASOCIADA ({pedidoAsociado.codigo_pedido})</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-800">
                    {pedidoAsociado.estado}
                  </span>
                </div>
                <div className="text-slate-700">
                  <span className="text-slate-500">Cliente:</span>{' '}
                  <strong className="text-slate-900">{pedidoAsociado.cliente_nombre}</strong> ({pedidoAsociado.cliente_documento})
                </div>
                {pedidoAsociado.numero_factura && (
                  <div className="text-slate-700 font-mono">
                    <span className="text-slate-500 font-sans">Factura / Guía:</span>{' '}
                    <strong>{pedidoAsociado.numero_factura}</strong>{' '}
                    {pedidoAsociado.numero_guia ? `/ ${pedidoAsociado.numero_guia}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
