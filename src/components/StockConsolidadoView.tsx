import React, { useState } from 'react';
import { StockConsolidadoTela, RolloConTela } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Plus,
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
  onOpenSalidaConTela,
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

  // Filtrado por tela, código de artículo, color, línea, código de rollo (ej. ROL-2026-00001) o lote (ej. LOT-2026-A1)
  const q = searchQuery.trim().toLowerCase();
  const filteredStock = stockList.filter((item) => {
    const matchesTela =
      !q ||
      item.nombre.toLowerCase().includes(q) ||
      item.codigo.toLowerCase().includes(q) ||
      item.codigo_color.toLowerCase().includes(q) ||
      item.color.toLowerCase().includes(q) ||
      (item.linea && item.linea.toLowerCase().includes(q));

    const rollosTela = q ? inventoryStore.getRollosDisponiblesFIFO(item.tela_id) : [];
    const matchesRollo =
      Boolean(q) &&
      rollosTela.some(
        (r) =>
          r.codigo_rollo.toLowerCase().includes(q) ||
          (r.lote && r.lote.toLowerCase().includes(q)) ||
          (r.ubicacion && r.ubicacion.toLowerCase().includes(q))
      );

    const matchesSearch = matchesTela || matchesRollo;

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
    <div className="space-y-6">
      {/* Encabezado y Contexto Operativo con estilo Google / Steve Jobs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Stock Físico Consolidado
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control de inventario en tiempo real según Consulta 1. Sumatoria física de rollos en estado{' '}
            <span className="font-mono font-semibold text-slate-800">DISPONIBLE</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented filter control con estilo Google pastel */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setFilterAlertsOnly(false)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                !filterAlertsOnly
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({stockList.length})
            </button>
            <button
              onClick={() => setFilterAlertsOnly(true)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
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

      {/* KPI Cards: Estilo cuadros limpios de Steve Jobs con fondos blanco y pasteles azules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Metros */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Metros Disponibles
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Ruler className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {totalMetrosGlobal.toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs font-semibold text-slate-500 font-mono">m</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Sumatoria física de rollos libres en almacén
          </div>
        </div>

        {/* Card 2: Rollos Físicos */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rollos en Almacén
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {totalRollosGlobal}
            </span>
            <span className="text-xs text-slate-500">rollos disponibles</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalRollosResGlobal > 0 ? (
              <span className="text-amber-700 font-medium">
                + {totalRollosResGlobal} rollos ({totalMetrosResGlobal.toFixed(1)}m) reservados en pedidos
              </span>
            ) : (
              '100% de rollos libres para despacho'
            )}
          </div>
        </div>

        {/* Card 3: Alertas */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Alerta de Reposición
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              telasEnAlerta.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono tabular-nums tracking-tight ${
                telasEnAlerta.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {telasEnAlerta.length}
            </span>
            <span className="text-xs text-slate-500">telas bajo mínimo</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {telasEnAlerta.length > 0 ? 'Requieren compra o producción' : 'Inventario en niveles óptimos'}
          </div>
        </div>

        {/* Card 4: Catálogo Maestro */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Variedades Registradas
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {stockList.length}
            </span>
            <span className="text-xs text-slate-500">artículos y colores</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Textiles Ocho Lukal E.I.R.L.</div>
        </div>
      </div>

      {/* Barra de Búsqueda estilo Google: caja redondeada limpia con sombra suave */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por artículo, color, tela, línea, rollo (ROL-...) o lote (LOT-...)..."
            className="w-full bg-white border border-slate-300 rounded-full pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs focus:outline-none focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 self-center">
          Mostrando {filteredStock.length} de {stockList.length} variedades registradas
        </div>
      </div>

      {/* Tabla de Stock Consolidado: Fondo blanco, texto nítido negro y bordes limpios */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-3 w-8"></th>
                <th className="py-3.5 px-3">Código Artículo</th>
                <th className="py-3.5 px-3">Cód. Color</th>
                <th className="py-3.5 px-3">Nombre Comercial</th>
                <th className="py-3.5 px-3">Línea</th>
                <th className="py-3.5 px-3 text-right">Ancho</th>
                <th className="py-3.5 px-3 text-right">Rollos Disp.</th>
                <th className="py-3.5 px-3 text-right">Metros Disp.</th>
                <th className="py-3.5 px-3 text-right">Stock Mínimo</th>
                <th className="py-3.5 px-3 text-center">Estado</th>
                <th className="py-3.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-slate-400">
                    <p className="text-base font-semibold text-slate-700">No se encontraron telas en el inventario</p>
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

                  return (
                    <React.Fragment key={item.tela_id}>
                      <tr
                        className={`hover:bg-blue-50/30 transition-colors ${
                          item.alerta_reposicion ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-slate-400">
                          <button
                            onClick={() => toggleExpand(item.tela_id)}
                            className="p-1 hover:text-slate-800 transition-colors"
                            title={isExpanded ? 'Ocultar rollos' : 'Ver rollos físicos disponibles (FIFO)'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#1a73e8]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs font-bold text-[#1a73e8]">
                          {item.codigo}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs font-bold text-slate-800">
                          {item.codigo_color}
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          <button
                            onClick={() => toggleExpand(item.tela_id)}
                            className="text-left hover:text-[#1a73e8] transition-colors"
                          >
                            {item.nombre}
                          </button>
                          <div className="text-[11px] text-slate-500 font-normal">
                            {item.color}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-slate-700 text-xs">
                          {item.linea || 'General'}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-700 font-medium">
                          {(Number(item.ancho) || 1.5).toFixed(2)} m
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                          {item.total_rollos_disponibles}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-extrabold tabular-nums text-slate-900 text-base">
                          {item.total_metros_disponibles.toFixed(2)}
                          <span className="text-xs font-normal text-slate-500 ml-1">m</span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-500 text-xs">
                          {item.stock_minimo_alerta.toFixed(2)} m
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {item.alerta_reposicion ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Alerta Reposición</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Óptimo</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleExpand(item.tela_id)}
                              className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap font-medium"
                            >
                              {isExpanded ? 'Ocultar' : `Rollos (${item.total_rollos_disponibles})`}
                            </button>

                            {item.total_rollos_disponibles > 0 && onArmarPedidoConTela && (
                              <button
                                onClick={() => onArmarPedidoConTela(item.tela_id)}
                                className="px-3 py-1 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-lg transition-all whitespace-nowrap shadow-2xs hover:shadow-xs active:scale-98"
                                title="Armar Pedido en el POS con esta tela"
                              >
                                + Armar Pedido
                              </button>
                            )}

                            {onOpenIngresoConTela && (
                              <button
                                onClick={() => onOpenIngresoConTela(item.tela_id)}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all whitespace-nowrap shadow-2xs"
                                title="Ingresar nuevos rollos de esta tela"
                              >
                                + Ingresar
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
                                    <span>Rollos Físicos Disponibles en Almacén (Orden FIFO por Antigüedad)</span>
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Consulta 3 SQL: Ordenados por fecha de ingreso ascendente para priorizar despacho First In, First Out.
                                  </p>
                                </div>
                                {item.total_rollos_disponibles > 0 && onArmarPedidoConTela && (
                                  <button
                                    onClick={() => onArmarPedidoConTela(item.tela_id)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl transition-all whitespace-nowrap shadow-xs"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    <span>Armar Pedido con esta Tela ({item.total_rollos_disponibles} rollos)</span>
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
                                            {new Date(rollo.fecha_ingreso).toLocaleString('es-PE', {
                                              dateStyle: 'short',
                                              timeStyle: 'short',
                                            })}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-sans">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {onVerTrazabilidadRollo && (
                                                <button
                                                  onClick={() => onVerTrazabilidadRollo(rollo.codigo_rollo)}
                                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                  title="Ver trazabilidad rollo a rollo"
                                                >
                                                  <Search className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                              {onVerEtiqueta && (
                                                <button
                                                  onClick={() => onVerEtiqueta(rollo)}
                                                  className="p-1.5 text-[#1a73e8] hover:bg-blue-50 rounded-lg transition-colors"
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
