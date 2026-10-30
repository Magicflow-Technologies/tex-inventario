import React, { useState } from 'react';
import { MovimientoCompleto, TipoMovimiento } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Calendar,
  User,
  Building,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface KardexMovimientosViewProps {
  movimientos: MovimientoCompleto[];
  onVerTrazabilidadRollo: (codigoRollo: string) => void;
}

export const KardexMovimientosView: React.FC<KardexMovimientosViewProps> = ({
  movimientos,
  onVerTrazabilidadRollo,
}) => {
  const [filterTipo, setFilterTipo] = useState<'ALL' | TipoMovimiento>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMovId, setExpandedMovId] = useState<string | null>(null);

  const filtered = movimientos.filter((m) => {
    const matchesTipo = filterTipo === 'ALL' || m.tipo_movimiento === filterTipo;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      m.documento_referencia.toLowerCase().includes(q) ||
      m.entidad_origen_destino.toLowerCase().includes(q) ||
      m.motivo.toLowerCase().includes(q) ||
      m.registrado_por.toLowerCase().includes(q) ||
      m.detalles.some((d) => d.codigo_rollo.toLowerCase().includes(q) || d.tela_nombre.toLowerCase().includes(q));

    return matchesTipo && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedMovId((curr) => (curr === id ? null : id));
  };

  const handleDeleteMovimiento = (e: React.MouseEvent, mov: MovimientoCompleto) => {
    e.stopPropagation();
    const msg =
      mov.tipo_movimiento === 'OUT'
        ? `¿Estás seguro de eliminar el movimiento de salida (${mov.documento_referencia})?\n\nLos rollos despachados en este movimiento volverán a estado DISPONIBLE.`
        : `¿Estás seguro de eliminar el registro de movimiento (${mov.documento_referencia}) del Kárdex?`;
    if (!window.confirm(msg)) return;
    try {
      inventoryStore.deleteMovimiento(mov.id);
      if (expandedMovId === mov.id) setExpandedMovId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar movimiento');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-[#1a73e8] text-xs font-semibold mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Kárdex Físico Auditable</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Kárdex de Movimientos de Inventario
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Registro inmutable de transacciones físicas (<span className="font-mono text-slate-700 font-semibold">movimientos_inventario</span>) y detalle rollo por rollo (<span className="font-mono text-slate-700 font-semibold">movimiento_detalles</span>).
          </p>
        </div>

        {/* Filter buttons */}
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setFilterTipo('ALL')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterTipo === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({movimientos.length})
          </button>
          <button
            onClick={() => setFilterTipo('IN')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterTipo === 'IN'
                ? 'bg-blue-50 text-[#1a73e8] font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ingresos IN
          </button>
          <button
            onClick={() => setFilterTipo('OUT')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterTipo === 'OUT'
                ? 'bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Salidas OUT
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por factura, guía, cliente, proveedor o código de rollo..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 shadow-sm transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium self-center">
          {filtered.length} movimientos registrados
        </div>
      </div>

      {/* Tabla Kárdex */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Tipo / Motivo</th>
                <th className="py-3 px-4">Documento SUNAT / Ref</th>
                <th className="py-3 px-4">Origen / Destino</th>
                <th className="py-3 px-4 text-right">Rollos</th>
                <th className="py-3 px-4 text-right">Metraje Total</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No hay movimientos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((mov) => {
                  const isExpanded = expandedMovId === mov.id;
                  const isIN = mov.tipo_movimiento === 'IN';

                  return (
                    <React.Fragment key={mov.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-blue-50/40' : ''
                        }`}
                        onClick={() => toggleExpand(mov.id)}
                      >
                        <td className="py-3.5 px-4 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#1a73e8]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap font-medium">
                          {new Date(mov.created_at).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {isIN ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1a73e8] border border-blue-200">
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>IN</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>OUT</span>
                              </span>
                            )}
                            <span className="text-xs font-mono font-semibold text-slate-800">
                              {mov.motivo}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900">
                          {mov.documento_referencia}
                        </td>

                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          {mov.entidad_origen_destino}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {mov.total_rollos}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {mov.total_metraje.toFixed(2)} m
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {mov.registrado_por}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMovimiento(e, mov)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar registro de movimiento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Detalles desplegables del movimiento */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50 p-0 border-y border-slate-200">
                            <div className="p-5 space-y-3">
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <div>
                                  <strong className="text-slate-900">Rollos físicos involucrados en la transacción</strong>{' '}
                                  (ID Movimiento: <span className="font-mono text-slate-500">{mov.id}</span>)
                                </div>
                                {mov.observaciones && (
                                  <div className="italic text-slate-500">
                                    Nota: "{mov.observaciones}"
                                  </div>
                                )}
                              </div>

                              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                    <tr>
                                      <th className="py-2.5 px-3 text-left">Código Rollo</th>
                                      <th className="py-2.5 px-3 text-left">Tela</th>
                                      <th className="py-2.5 px-3 text-left">Color</th>
                                      <th className="py-2.5 px-3 text-right">Metraje Exacto</th>
                                      <th className="py-2.5 px-3 text-left">Ubicación Registrada</th>
                                      <th className="py-2.5 px-3 text-right">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {mov.detalles.map((det) => (
                                      <tr key={det.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2.5 px-3 font-bold text-[#1a73e8]">
                                          {det.codigo_rollo}
                                        </td>
                                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                                          {det.tela_nombre}
                                        </td>
                                        <td className="py-2.5 px-3 font-sans text-slate-600">
                                          {det.tela_color}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                                          {det.metraje_movimiento.toFixed(2)} m
                                        </td>
                                        <td className="py-2.5 px-3 font-sans text-slate-500">
                                          {det.ubicacion || 'Almacén Central'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-sans">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onVerTrazabilidadRollo(det.codigo_rollo);
                                            }}
                                            className="px-2.5 py-1 text-xs text-[#1a73e8] hover:text-white bg-blue-50 hover:bg-[#1a73e8] rounded-lg border border-blue-200 transition-all font-semibold cursor-pointer"
                                          >
                                            Ver Trazabilidad
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
