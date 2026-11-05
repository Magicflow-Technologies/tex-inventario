import React, { useState } from 'react';
import { StockConsolidadoTela, RolloConTela } from '../types/inventory';
import { inventoryStore, normalizeLinea } from '../services/inventoryStore';
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Tag,
  Warehouse,
  Search,
  ShoppingCart,
  Ruler,
  Trash2,
} from 'lucide-react';

interface StockConsolidadoViewProps {
  stockList: StockConsolidadoTela[];
  onOpenIngresoConTela?: (telaId: string) => void;
  onOpenSalidaConTela?: (telaId: string) => void;
  onArmarPedidoConTela?: (telaId: string) => void;
  onVerTrazabilidadRollo?: (codigoRollo: string) => void;
  onVerEtiqueta?: (rollo: RolloConTela) => void;
}

export const StockConsolidadoView: React.FC<StockConsolidadoViewProps> = ({
  stockList,
  onOpenIngresoConTela,
  onArmarPedidoConTela,
  onVerTrazabilidadRollo,
  onVerEtiqueta,
}) => {
  const [expandedTelaId, setExpandedTelaId] = useState<string | null>(null);
  const [filterAlertsOnly, setFilterAlertsOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Totales globales
  const totalMetrosGlobal = stockList.reduce((acc, item) => acc + item.total_metros_disponibles, 0);
  const totalRollosGlobal = stockList.reduce((acc, item) => acc + item.total_rollos_disponibles, 0);
  const totalMetrosResGlobal = stockList.reduce((acc, item) => acc + (item.total_metros_reservados || 0), 0);
  const totalRollosResGlobal = stockList.reduce((acc, item) => acc + (item.total_rollos_reservados || 0), 0);
  const telasEnAlerta = stockList.filter((item) => item.alerta_reposicion);

  // Filtrado completo por cualquier columna de la tabla y subtabla (código, color, tela, línea, ancho, metros, rollos, estado, código de rollo, lote, ubicación)
  const q = searchQuery.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const filteredStock = stockList.filter((item) => {
    const rollosTela = tokens.length > 0 ? inventoryStore.getRollosDisponiblesFIFO(item.tela_id) : [];

    const telaText = [
      item.codigo,
      item.codigo_color,
      item.nombre,
      item.color,
      item.linea || 'General',
      (Number(item.ancho) || 1.5).toFixed(2),
      String(item.total_rollos_disponibles),
      item.total_metros_disponibles.toFixed(2),
      String(item.total_metros_disponibles),
      item.stock_minimo_alerta.toFixed(2),
      item.alerta_reposicion ? 'alerta reposicion' : 'optimo óptimo',
    ]
      .join(' ')
      .toLowerCase();

    const rollosText = rollosTela
      .map((r) =>
        [
          r.codigo_rollo,
          r.metraje.toFixed(2),
          String(r.metraje),
          r.lote || '',
          r.ubicacion || '',
        ].join(' ')
      )
      .join(' ')
      .toLowerCase();

    const combinedText = `${telaText} ${rollosText}`;
    const matchesSearch =
      tokens.length === 0 || tokens.every((tok) => combinedText.includes(tok));

    if (filterAlertsOnly) {
      return matchesSearch && item.alerta_reposicion;
    }
    return matchesSearch;
  });

  const toggleExpand = (telaId: string) => {
    setExpandedTelaId((curr) => (curr === telaId ? null : telaId));
  };

  const handleDeleteTela = (item: StockConsolidadoTela) => {
    const totalRollos = item.total_rollos_disponibles + (item.total_rollos_reservados || 0);
    const msg =
      totalRollos > 0
        ? `¿Estás seguro de eliminar la tela "${item.nombre}" (${item.codigo})?\n\nEsto también eliminará sus ${totalRollos} rollo(s) en inventario.`
        : `¿Estás seguro de eliminar la tela "${item.nombre}" (${item.codigo})?`;
    if (!window.confirm(msg)) return;
    try {
      inventoryStore.deleteTela(item.tela_id);
      if (expandedTelaId === item.tela_id) setExpandedTelaId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar tela');
    }
  };

  const handleDeleteRollo = (rollo: RolloConTela) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el rollo físico ${rollo.codigo_rollo} (${rollo.metraje.toFixed(2)} m) del inventario?`
      )
    )
      return;
    try {
      inventoryStore.deleteRollo(rollo.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar rollo');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Encabezado y Contexto Operativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Stock Físico Consolidado
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Control de inventario en tiempo real según Consulta 1. Sumatoria física de rollos en estado{' '}
            <span className="font-mono font-semibold text-slate-800">DISPONIBLE</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setFilterAlertsOnly(false)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                !filterAlertsOnly
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({stockList.length})
            </button>
            <button
              onClick={() => setFilterAlertsOnly(true)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                filterAlertsOnly
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              En Alerta ({telasEnAlerta.length})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: 2 columnas en celular, 4 en escritorio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Metros */}
        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">
              Metros Disponibles
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
              <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {totalMetrosGlobal.toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs font-semibold text-slate-500 font-mono">m</span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1">
            Sumatoria física de rollos libres en almacén
          </div>
        </div>

        {/* Card 2: Rollos Físicos */}
        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">
              Rollos en Almacén
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {totalRollosGlobal}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">rollos disp.</span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1">
            {totalRollosResGlobal > 0 ? (
              <span className="text-amber-700 font-medium">
                + {totalRollosResGlobal} rollos ({totalMetrosResGlobal.toFixed(1)}m) reservados
              </span>
            ) : (
              '100% de rollos libres para despacho'
            )}
          </div>
        </div>

        {/* Card 3: Alertas */}
        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">
              Alerta de Reposición
            </span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                telasEnAlerta.length > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${
                telasEnAlerta.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {telasEnAlerta.length}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">bajo mínimo</span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1">
            {telasEnAlerta.length > 0 ? 'Requieren compra o producción' : 'Inventario en niveles óptimos'}
          </div>
        </div>

        {/* Card 4: Catálogo Maestro */}
        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight">
              Variedades Registradas
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
              <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {stockList.length}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">artículos</span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-1">
            Textiles Ocho Lukal E.I.R.L.
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por artículo, color, tela, línea, rollo (ROL-...) o lote (LOT-...)..."
            className="w-full bg-white border border-slate-300 rounded-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-2xs focus:outline-none focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 sm:self-center">
          Mostrando {filteredStock.length} de {stockList.length} variedades registradas
        </div>
      </div>

      {/* ================= VISTA MÓVIL (TARJETAS ADAPTABLES PARA CELULARES, md:hidden) ================= */}
      <div className="md:hidden space-y-3">
        {filteredStock.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-700">
              No se encontraron telas en el inventario
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? 'Prueba ajustando los términos de búsqueda.'
                : 'No hay telas activas en la base de datos.'}
            </p>
          </div>
        ) : (
          filteredStock.map((item) => {
            const allRollosFIFO = inventoryStore.getRollosDisponiblesFIFO(item.tela_id);
            const matchesTelaDirectly =
              !q ||
              item.nombre.toLowerCase().includes(q) ||
              item.codigo.toLowerCase().includes(q) ||
              item.codigo_color.toLowerCase().includes(q) ||
              item.color.toLowerCase().includes(q) ||
              Boolean(item.linea && item.linea.toLowerCase().includes(q));

            const hasMatchingRollo =
              Boolean(q) &&
              allRollosFIFO.some(
                (r) =>
                  r.codigo_rollo.toLowerCase().includes(q) ||
                  (r.lote && r.lote.toLowerCase().includes(q)) ||
                  (r.ubicacion && r.ubicacion.toLowerCase().includes(q))
              );

            const isExpanded =
              expandedTelaId === item.tela_id || (Boolean(q) && hasMatchingRollo);

            const rollosFIFO = isExpanded
              ? !matchesTelaDirectly && hasMatchingRollo
                ? allRollosFIFO.filter(
                    (r) =>
                      r.codigo_rollo.toLowerCase().includes(q) ||
                      (r.lote && r.lote.toLowerCase().includes(q)) ||
                      (r.ubicacion && r.ubicacion.toLowerCase().includes(q))
                  )
                : allRollosFIFO
              : [];

            return (
              <div
                key={item.tela_id}
                className={`bg-white border rounded-2xl shadow-2xs overflow-hidden transition-all ${
                  item.alerta_reposicion ? 'border-amber-200/90' : 'border-slate-200'
                }`}
              >
                <div className="p-3.5 space-y-3">
                  {/* Fila superior de la tarjeta móvil */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1a73e8] font-mono text-xs font-bold border border-blue-200">
                          {item.codigo}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-bold border border-slate-200">
                          Cód. {item.codigo_color}
                        </span>
                        {item.alerta_reposicion ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Alerta</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Óptimo</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => toggleExpand(item.tela_id)}
                        className="mt-1.5 text-left font-bold text-slate-900 text-sm hover:text-[#1a73e8] block"
                      >
                        {item.nombre} — <span className="text-blue-700">{item.color}</span>
                      </button>
                      <div className="text-[11px] text-slate-500">
                        {item.linea || 'General'} · Ancho: {(Number(item.ancho) || 1.5).toFixed(2)} m
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTela(item)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                      title="Eliminar esta tela del catálogo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Caja de métricas de Stock */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">
                        Rollos Disp.
                      </div>
                      <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                        {item.total_rollos_disponibles}
                      </div>
                    </div>
                    <div className="border-x border-slate-200/80 px-1">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">
                        Metros Disp.
                      </div>
                      <div className="font-mono font-extrabold text-sm text-[#1a73e8] mt-0.5">
                        {item.total_metros_disponibles.toFixed(2)} m
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">
                        Stock Mín.
                      </div>
                      <div className="font-mono font-medium text-xs text-slate-600 mt-0.5">
                        {item.stock_minimo_alerta.toFixed(0)} m
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción en celular */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => toggleExpand(item.tela_id)}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <span>
                        {isExpanded ? 'Ocultar Rollos' : `Ver Rollos (${item.total_rollos_disponibles})`}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          isExpanded ? 'rotate-180 text-[#1a73e8]' : ''
                        }`}
                      />
                    </button>

                    {item.total_rollos_disponibles > 0 && onArmarPedidoConTela && (
                      <button
                        onClick={() => onArmarPedidoConTela(item.tela_id)}
                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl transition-all text-center shadow-2xs"
                      >
                        + Armar Pedido
                      </button>
                    )}

                    {onOpenIngresoConTela && (
                      <button
                        onClick={() => onOpenIngresoConTela(item.tela_id)}
                        className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all"
                      >
                        + Ingresar
                      </button>
                    )}
                  </div>
                </div>

                {/* Desplegable de rollos físicos en celular */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-200 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-[#1a73e8]" />
                        Rollos Físicos (Orden FIFO)
                      </span>
                    </div>

                    {rollosFIFO.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                        No hay rollos físicos disponibles para esta tela.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {rollosFIFO.map((rollo) => {
                          const fifoIdx = allRollosFIFO.findIndex((r) => r.id === rollo.id);
                          const priorityNum = fifoIdx !== -1 ? fifoIdx + 1 : 1;
                          const isHighlighted =
                            Boolean(q) &&
                            (rollo.codigo_rollo.toLowerCase().includes(q) ||
                              Boolean(rollo.lote && rollo.lote.toLowerCase().includes(q)));

                          return (
                            <div
                              key={rollo.id}
                              className={`p-3 rounded-xl bg-white border text-xs space-y-2 ${
                                isHighlighted
                                  ? 'border-blue-400 bg-blue-50/40'
                                  : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-mono font-bold text-[#1a73e8] block">
                                    #{priorityNum}{' '}
                                    {priorityNum === 1 ? '(Siguiente a Despachar)' : ''}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900 text-xs">
                                    {rollo.codigo_rollo}
                                  </span>
                                </div>
                                <div className="text-right font-mono font-black text-sm text-slate-900">
                                  {rollo.metraje.toFixed(2)} m
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                                <div>
                                  <span className="font-mono font-semibold text-slate-700">
                                    {rollo.lote || 'N/A'}
                                  </span>{' '}
                                  · <span>{rollo.ubicacion || 'Almacén Central'}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {onVerTrazabilidadRollo && (
                                    <button
                                      onClick={() => onVerTrazabilidadRollo(rollo.codigo_rollo)}
                                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                                      title="Ver trazabilidad"
                                    >
                                      <Search className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onVerEtiqueta && (
                                    <button
                                      onClick={() => onVerEtiqueta(rollo)}
                                      className="p-1.5 text-[#1a73e8] bg-blue-50 rounded-lg"
                                      title="Imprimir etiqueta QR"
                                    >
                                      <Tag className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteRollo(rollo)}
                                    className="p-1.5 text-rose-600 bg-rose-50 rounded-lg"
                                    title="Eliminar rollo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ================= VISTA ESCRITORIO (TABLA CONSOLIDADA, hidden md:block) ================= */}
      <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-5 pr-2.5 whitespace-nowrap">Artículo</th>
                <th className="py-3.5 px-2.5 whitespace-nowrap">Cód. Color</th>
                <th className="py-3.5 px-3 min-w-[180px]">Nombre Comercial / Color</th>
                <th className="py-3.5 px-2.5 whitespace-nowrap">Línea</th>
                <th className="py-3.5 px-2.5 text-right whitespace-nowrap">P. Lista</th>
                <th className="py-3.5 px-2.5 text-right whitespace-nowrap">Ancho</th>
                <th className="py-3.5 px-2.5 text-right whitespace-nowrap">Rollos</th>
                <th className="py-3.5 px-2.5 text-right whitespace-nowrap">Metros Disp.</th>
                <th className="py-3.5 px-2.5 text-right whitespace-nowrap">Stock Mín.</th>
                <th className="py-3.5 px-2.5 text-center whitespace-nowrap">Estado</th>
                <th className="py-3.5 pl-2.5 pr-5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-slate-400">
                    <p className="text-base font-semibold text-slate-700">
                      No se encontraron telas en el inventario
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery
                        ? 'Prueba ajustando los términos de búsqueda.'
                        : 'No hay telas activas en la base de datos.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const allRollosFIFO = inventoryStore.getRollosDisponiblesFIFO(item.tela_id);
                  const matchesTelaDirectly =
                    !q ||
                    item.nombre.toLowerCase().includes(q) ||
                    item.codigo.toLowerCase().includes(q) ||
                    item.codigo_color.toLowerCase().includes(q) ||
                    item.color.toLowerCase().includes(q) ||
                    Boolean(item.linea && item.linea.toLowerCase().includes(q));

                  const hasMatchingRollo =
                    Boolean(q) &&
                    allRollosFIFO.some(
                      (r) =>
                        r.codigo_rollo.toLowerCase().includes(q) ||
                        (r.lote && r.lote.toLowerCase().includes(q)) ||
                        (r.ubicacion && r.ubicacion.toLowerCase().includes(q))
                    );

                  const isExpanded =
                    expandedTelaId === item.tela_id || (Boolean(q) && hasMatchingRollo);

                  const rollosFIFO = isExpanded
                    ? !matchesTelaDirectly && hasMatchingRollo
                      ? allRollosFIFO.filter(
                          (r) =>
                            r.codigo_rollo.toLowerCase().includes(q) ||
                            (r.lote && r.lote.toLowerCase().includes(q)) ||
                            (r.ubicacion && r.ubicacion.toLowerCase().includes(q))
                        )
                      : allRollosFIFO
                    : [];

                  const precioLista = Number(item.precio_lista) || 12.5;

                  return (
                    <React.Fragment key={item.tela_id}>
                      <tr
                        className={`hover:bg-blue-50/30 transition-colors ${
                          item.alerta_reposicion ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Artículo con flecha integrada (sin columna vacía a la izquierda) */}
                        <td className="py-3 pl-5 pr-2.5 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(item.tela_id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1a73e8] border border-blue-200 font-mono text-xs font-bold transition-colors cursor-pointer"
                            title={
                              isExpanded
                                ? 'Ocultar rollos físicos'
                                : 'Ver rollos físicos disponibles (FIFO)'
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{item.codigo}</span>
                          </button>
                        </td>

                        {/* Cód. Color */}
                        <td className="py-3 px-2.5 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {item.codigo_color}
                          </span>
                        </td>

                        {/* Nombre Comercial / Color (amplio en 1 línea sin partir palabras) */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleExpand(item.tela_id)}
                            className="text-left font-bold text-slate-900 hover:text-[#1a73e8] transition-colors cursor-pointer block whitespace-nowrap"
                          >
                            {item.nombre}
                          </button>
                          <div className="text-[11px] text-blue-700 font-semibold whitespace-nowrap">
                            {item.color}
                          </div>
                        </td>

                        {/* Línea Normalizada */}
                        <td className="py-3 px-2.5 text-slate-600 text-xs font-medium whitespace-nowrap">
                          {normalizeLinea(item.linea)}
                        </td>

                        {/* Precio de Lista */}
                        <td className="py-3 px-2.5 text-right font-mono text-xs font-bold text-emerald-700 whitespace-nowrap">
                          S/ {precioLista.toFixed(2)}
                        </td>

                        {/* Ancho */}
                        <td className="py-3 px-2.5 text-right font-mono text-xs text-slate-600 font-medium whitespace-nowrap">
                          {(Number(item.ancho) || 1.5).toFixed(2)} m
                        </td>

                        {/* Rollos Disponibles */}
                        <td className="py-3 px-2.5 text-right font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap">
                          {item.total_rollos_disponibles}
                        </td>

                        {/* Metros Disponibles */}
                        <td className="py-3 px-2.5 text-right font-mono font-extrabold tabular-nums text-slate-900 text-sm whitespace-nowrap">
                          {item.total_metros_disponibles.toFixed(2)}
                          <span className="text-[11px] font-semibold text-blue-600 ml-0.5">m</span>
                        </td>

                        {/* Stock Mínimo */}
                        <td className="py-3 px-2.5 text-right font-mono tabular-nums text-slate-500 text-xs whitespace-nowrap">
                          {item.stock_minimo_alerta.toFixed(0)} m
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          {item.alerta_reposicion ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200 whitespace-nowrap"
                              title="Stock por debajo del mínimo de reposición"
                            >
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Reposición</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Óptimo</span>
                            </span>
                          )}
                        </td>

                        {/* Acciones completas y visibles */}
                        <td className="py-3 pl-2.5 pr-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleExpand(item.tela_id)}
                              className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap font-semibold cursor-pointer"
                            >
                              {isExpanded
                                ? 'Ocultar'
                                : `Rollos (${item.total_rollos_disponibles})`}
                            </button>

                            {item.total_rollos_disponibles > 0 && onArmarPedidoConTela && (
                              <button
                                onClick={() => onArmarPedidoConTela(item.tela_id)}
                                className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-lg transition-all whitespace-nowrap shadow-2xs cursor-pointer"
                                title="Armar Pedido en el POS con esta tela"
                              >
                                + Pedido
                              </button>
                            )}

                            {onOpenIngresoConTela && (
                              <button
                                onClick={() => onOpenIngresoConTela(item.tela_id)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all whitespace-nowrap shadow-2xs cursor-pointer"
                                title="Ingresar nuevos rollos de esta tela"
                              >
                                + Rollos
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteTela(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar esta tela del catálogo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-tabla desplegable: Consulta 3 (Picking FIFO de rollos físicos) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="bg-slate-50/70 p-0 border-y border-slate-200">
                            <div className="p-4 sm:p-5 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                                <div>
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <Warehouse className="w-4 h-4 text-[#1a73e8]" />
                                    <span>
                                      Rollos Físicos Disponibles en Almacén (Orden FIFO por Antigüedad)
                                    </span>
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Consulta 3 SQL: Ordenados por fecha de ingreso ascendente para priorizar despacho First In, First Out.
                                  </p>
                                </div>
                                {item.total_rollos_disponibles > 0 && onArmarPedidoConTela && (
                                  <button
                                    onClick={() => onArmarPedidoConTela(item.tela_id)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl transition-all whitespace-nowrap shadow-xs cursor-pointer"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    <span>
                                      Armar Pedido con esta Tela ({item.total_rollos_disponibles} rollos)
                                    </span>
                                  </button>
                                )}
                              </div>

                              {rollosFIFO.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-500">
                                  No hay rollos físicos disponibles para esta tela actualmente.
                                </div>
                              ) : (
                                <div className="border border-slate-200 rounded-xl bg-white overflow-x-auto shadow-2xs">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                                      <tr>
                                        <th className="py-2.5 px-3 text-left">Prioridad FIFO</th>
                                        <th className="py-2.5 px-3 text-left">Código de Rollo</th>
                                        <th className="py-2.5 px-3 text-right">Metraje Exacto</th>
                                        <th className="py-2.5 px-3 text-left">Lote / DUA</th>
                                        <th className="py-2.5 px-3 text-left">Ubicación Almacén</th>
                                        <th className="py-2.5 px-3 text-left">Fecha de Ingreso</th>
                                        <th className="py-2.5 px-3 text-right">Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                      {rollosFIFO.map((rollo) => {
                                        const fifoIdx = allRollosFIFO.findIndex(
                                          (r) => r.id === rollo.id
                                        );
                                        const priorityNum = fifoIdx !== -1 ? fifoIdx + 1 : 1;
                                        const isHighlighted =
                                          Boolean(q) &&
                                          (rollo.codigo_rollo.toLowerCase().includes(q) ||
                                            Boolean(
                                              rollo.lote && rollo.lote.toLowerCase().includes(q)
                                            ));
                                        return (
                                          <tr
                                            key={rollo.id}
                                            className={`hover:bg-blue-50/30 ${
                                              isHighlighted ? 'bg-blue-50/70' : ''
                                            }`}
                                          >
                                            <td className="py-2.5 px-3 text-[#1a73e8] font-bold">
                                              #{priorityNum}{' '}
                                              {priorityNum === 1 ? '(Siguiente a Despachar)' : ''}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-900 font-bold">
                                              {rollo.codigo_rollo}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-slate-900 font-bold tabular-nums">
                                              {rollo.metraje.toFixed(2)} m
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700">
                                              {rollo.lote || 'N/A'}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700 font-sans">
                                              {rollo.ubicacion || 'Almacén Central'}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">
                                              {new Date(rollo.fecha_ingreso).toLocaleString(
                                                'es-PE',
                                                {
                                                  dateStyle: 'short',
                                                  timeStyle: 'short',
                                                }
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-sans">
                                              <div className="flex items-center justify-end gap-1.5">
                                                {onVerTrazabilidadRollo && (
                                                  <button
                                                    onClick={() =>
                                                      onVerTrazabilidadRollo(rollo.codigo_rollo)
                                                    }
                                                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    title="Ver trazabilidad rollo a rollo"
                                                  >
                                                    <Search className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                                {onVerEtiqueta && (
                                                  <button
                                                    onClick={() => onVerEtiqueta(rollo)}
                                                    className="p-1.5 text-[#1a73e8] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Ver e imprimir etiqueta térmica de rollo"
                                                  >
                                                    <Tag className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handleDeleteRollo(rollo)}
                                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                  title="Eliminar rollo físico"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
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
