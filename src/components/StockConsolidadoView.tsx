import React, { useState, useMemo } from 'react';
import { StockConsolidadoTela, RolloConTela } from '../types/inventory';
import { inventoryStore, normalizeLinea, normalizeSpaces } from '../services/inventoryStore';
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
  posCartRolloIds?: string[];
  onOpenIngresoConTela?: (telaId: string) => void;
  onOpenSalidaConTela?: (telaId: string) => void;
  onArmarPedidoConTela?: (telaId: string) => void;
  onAgregarRolloAPos?: (rollo: RolloConTela) => void;
  onVerTrazabilidadRollo?: (codigoRollo: string) => void;
  onVerEtiqueta?: (rollo: RolloConTela) => void;
}

interface GrupoStockGeneral {
  groupKey: string;
  linea: string;
  codigoArticulo: string;
  nombreBase: string;
  ancho: string;
  variantes: StockConsolidadoTela[];
  totalMetros: number;
  totalRollos: number;
  alertasCount: number;
}

export const StockConsolidadoView: React.FC<StockConsolidadoViewProps> = ({
  stockList,
  posCartRolloIds = [],
  onOpenIngresoConTela,
  onAgregarRolloAPos,
  onVerTrazabilidadRollo,
  onVerEtiqueta,
}) => {
  // Por defecto cerrado: al hacer clic en "Línea ... (Código)" se despliegan los códigos de colores
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});
  const [expandedTelaId, setExpandedTelaId] = useState<string | null>(null);
  const [filterAlertsOnly, setFilterAlertsOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Totales globales
  const totalMetrosGlobal = stockList.reduce((acc, item) => acc + item.total_metros_disponibles, 0);
  const totalRollosGlobal = stockList.reduce((acc, item) => acc + item.total_rollos_disponibles, 0);
  const totalMetrosResGlobal = stockList.reduce(
    (acc, item) => acc + (item.total_metros_reservados || 0),
    0
  );
  const totalRollosResGlobal = stockList.reduce(
    (acc, item) => acc + (item.total_rollos_reservados || 0),
    0
  );
  const telasEnAlerta = stockList.filter((item) => item.alerta_reposicion);

  // Filtrado completo por cualquier columna de la tabla y subtabla
  const q = searchQuery.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const filteredStock = useMemo(() => {
    return stockList.filter((item) => {
      const rollosTela =
        tokens.length > 0 ? inventoryStore.getRollosDisponiblesFIFO(item.tela_id) : [];

      const telaText = [
        item.codigo,
        item.codigo_color,
        item.nombre,
        item.color,
        normalizeLinea(item.linea),
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
  }, [stockList, tokens, filterAlertsOnly]);

  // Agrupar por Línea + Código de Artículo (ej. Línea Moda Masculino (C-900))
  const gruposStock = useMemo<GrupoStockGeneral[]>(() => {
    const mapGrupos = new Map<string, GrupoStockGeneral>();

    filteredStock.forEach((item) => {
      const lineaNorm = normalizeLinea(item.linea);
      const codigoNorm = normalizeSpaces(item.codigo).toUpperCase();
      const nombreLimpio = normalizeSpaces(item.nombre).replace(/8Tex/g, '8tex');
      const groupKey = `${lineaNorm.toLowerCase()}__${codigoNorm}`;

      const existing = mapGrupos.get(groupKey);
      if (!existing) {
        mapGrupos.set(groupKey, {
          groupKey,
          linea: lineaNorm,
          codigoArticulo: codigoNorm,
          nombreBase: nombreLimpio,
          ancho: `${(Number(item.ancho) || 1.6).toFixed(2)} m`,
          variantes: [{ ...item, nombre: nombreLimpio, linea: lineaNorm }],
          totalMetros: item.total_metros_disponibles,
          totalRollos: item.total_rollos_disponibles,
          alertasCount: item.alerta_reposicion ? 1 : 0,
        });
      } else {
        existing.variantes.push({ ...item, nombre: nombreLimpio, linea: lineaNorm });
        existing.totalMetros += item.total_metros_disponibles;
        existing.totalRollos += item.total_rollos_disponibles;
        if (item.alerta_reposicion) existing.alertasCount += 1;
        const partes = existing.nombreBase
          .split(' / ')
          .map((p) => normalizeSpaces(p).toLowerCase());
        if (!partes.includes(nombreLimpio.toLowerCase())) {
          existing.nombreBase = `${existing.nombreBase} / ${nombreLimpio}`;
        }
      }
    });

    // Ordenar variantes por Código de Color numérico (2001, 2002, 2003...)
    return Array.from(mapGrupos.values()).map((g) => ({
      ...g,
      variantes: [...g.variantes].sort((a, b) =>
        (a.codigo_color || '').localeCompare(b.codigo_color || '', undefined, { numeric: true })
      ),
    }));
  }, [filteredStock]);

  const toggleGrupo = (groupKey: string) => {
    setGruposAbiertos((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const toggleExpand = (telaId: string) => {
    setExpandedTelaId((curr) => (curr === telaId ? null : telaId));
  };

  const handleDeleteTela = (item: StockConsolidadoTela) => {
    const totalRollos = item.total_rollos_disponibles + (item.total_rollos_reservados || 0);
    const msg =
      totalRollos > 0
        ? `¿Estás seguro de eliminar la tela "${item.nombre}" (${item.codigo} - Cód. ${item.codigo_color})?\n\nEsto también eliminará sus ${totalRollos} rollo(s) en inventario.`
        : `¿Estás seguro de eliminar la tela "${item.nombre}" (${item.codigo} - Cód. ${item.codigo_color})?`;
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
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Stock General
        </h1>

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
        </div>

        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
          {totalRollosResGlobal > 0 && (
            <div className="text-[11px] text-amber-700 font-medium mt-1">
              + {totalRollosResGlobal} rollos ({totalMetrosResGlobal.toFixed(1)}m) reservados
            </div>
          )}
        </div>

        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
        </div>

        <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Códigos de Color
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
              <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {stockList.length}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">colores</span>
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
            placeholder="Buscar por línea, artículo (C-900), cód. color (2001), color, rollo o lote..."
            className="w-full bg-white border border-slate-300 rounded-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-2xs focus:outline-none focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 sm:self-center">
          {gruposStock.length} {gruposStock.length === 1 ? 'artículo agrupado' : 'artículos agrupados'} ·{' '}
          {filteredStock.length} códigos de color
        </div>
      </div>

      {/* ================= AGRUPACIÓN POR LÍNEA Y CÓDIGO DE ARTÍCULO ================= */}
      {gruposStock.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-400">
          <p className="text-base font-semibold text-slate-700">
            No se encontraron telas en el inventario
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gruposStock.map((grupo) => {
            const isGrupoAbierto = Boolean(q) || Boolean(gruposAbiertos[grupo.groupKey]);

            return (
              <div
                key={grupo.groupKey}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs"
              >
                {/* CABECERA DEL GRUPO: Línea Moda Masculino (C-900) — Al hacer clic despliega los códigos de color */}
                <div
                  onClick={() => toggleGrupo(grupo.groupKey)}
                  className="px-4 sm:px-6 py-4 bg-slate-50/90 hover:bg-blue-50/40 cursor-pointer flex items-center justify-between gap-4 border-b border-slate-200/80 transition select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-3 h-9 rounded-xl bg-blue-100 text-[#1a73e8] font-mono text-xs sm:text-sm font-black flex items-center justify-center shrink-0 border border-blue-200">
                      {grupo.codigoArticulo}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-black text-slate-900">
                          Línea {grupo.linea} ({grupo.codigoArticulo})
                        </h2>
                        <span className="text-[11px] font-bold text-[#1a73e8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {grupo.variantes.length} códigos de color
                        </span>
                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                          · Ancho: <strong className="text-slate-700">{grupo.ancho}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5 truncate">
                        {grupo.nombreBase}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-black text-slate-900 font-mono">
                        {grupo.totalMetros.toFixed(2)}{' '}
                        <span className="text-xs text-[#1a73e8] font-bold font-sans">m</span>
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-bold flex items-center justify-end gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#1a73e8]" />
                        <span>
                          {grupo.totalRollos} {grupo.totalRollos === 1 ? 'rollo' : 'rollos'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                        isGrupoAbierto
                          ? 'bg-[#1a73e8] text-white shadow-2xs'
                          : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300/70'
                      }`}
                    >
                      <span className="hidden sm:inline">
                        {isGrupoAbierto ? 'Ocultar Colores' : 'Ver Colores'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isGrupoAbierto ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* CONTENIDO DESPLEGABLE AL HACER CLIC: Códigos de Color 1, 2, 3... */}
                {isGrupoAbierto && (
                  <>
                    {/* VISTA MÓVIL DE COLORES (md:hidden) */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {grupo.variantes.map((item) => {
                        const allRollosFIFO = inventoryStore.getRollosDisponiblesFIFO(item.tela_id);
                        const isExpanded = expandedTelaId === item.tela_id;
                        const precioLista = Number(item.precio_lista) || 12.5;

                        return (
                          <div key={item.tela_id} className="p-3.5 space-y-2.5 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                                    Cód. Color {item.codigo_color}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold">
                                    S/ {precioLista.toFixed(2)}/m
                                  </span>
                                </div>
                                <div className="mt-1 font-bold text-slate-900 text-sm">
                                  {item.nombre} — <span className="text-blue-700">{item.color}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteTela(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2 border border-slate-100 text-center text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 block">Rollos</span>
                                <strong className="font-mono">{item.total_rollos_disponibles}</strong>
                              </div>
                              <div className="border-x border-slate-200">
                                <span className="text-[10px] text-slate-500 block">Metros Disp.</span>
                                <strong className="font-mono text-[#1a73e8]">
                                  {item.total_metros_disponibles.toFixed(2)} m
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">Stock Mín.</span>
                                <strong className="font-mono text-slate-600">
                                  {item.stock_minimo_alerta.toFixed(0)} m
                                </strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleExpand(item.tela_id)}
                                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl flex items-center justify-center gap-1"
                              >
                                <span>Rollos ({allRollosFIFO.length})</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              {onOpenIngresoConTela && (
                                <button
                                  onClick={() => onOpenIngresoConTela(item.tela_id)}
                                  className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl"
                                >
                                  + Rollos
                                </button>
                              )}
                            </div>

                            {isExpanded && allRollosFIFO.length > 0 && (
                              <div className="pt-2 space-y-1.5 border-t border-slate-100 max-h-96 overflow-y-auto">
                                {allRollosFIFO.map((rollo, idx) => {
                                  const enCarritoPos = posCartRolloIds.includes(rollo.id);
                                  return (
                                    <div
                                      key={rollo.id}
                                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs font-mono"
                                    >
                                      <div>
                                        <span className="font-bold text-[#1a73e8]">#{idx + 1}</span>{' '}
                                        <span className="font-bold text-slate-900">
                                          {rollo.codigo_rollo}
                                        </span>
                                        <div className="text-[10px] text-slate-500 font-sans">
                                          {rollo.lote || 'S/L'} · {rollo.ubicacion || 'Almacén'}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-black text-slate-900">
                                          {rollo.metraje.toFixed(2)} m
                                        </span>
                                        {onAgregarRolloAPos && (
                                          <button
                                            onClick={() => onAgregarRolloAPos(rollo)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-bold text-white cursor-pointer ${
                                              enCarritoPos
                                                ? 'bg-emerald-600'
                                                : 'bg-[#1a73e8] hover:bg-[#1557b0]'
                                            }`}
                                          >
                                            {enCarritoPos ? '✓ En POS' : '+ Armar Pedido'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* VISTA ESCRITORIO DE COLORES (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-bold">
                          <tr>
                            <th className="py-3 pl-5 pr-2.5 whitespace-nowrap">Cód. Color</th>
                            <th className="py-3 px-3 min-w-[180px]">Nombre Comercial / Color</th>
                            <th className="py-3 px-2.5 text-right whitespace-nowrap">P. Lista</th>
                            <th className="py-3 px-2.5 text-right whitespace-nowrap">Ancho</th>
                            <th className="py-3 px-2.5 text-right whitespace-nowrap">Rollos</th>
                            <th className="py-3 px-2.5 text-right whitespace-nowrap">
                              Metros Disp.
                            </th>
                            <th className="py-3 px-2.5 text-right whitespace-nowrap">
                              Stock Mín.
                            </th>
                            <th className="py-3 px-2.5 text-center whitespace-nowrap">Estado</th>
                            <th className="py-3 pl-2.5 pr-5 text-right whitespace-nowrap">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {grupo.variantes.map((item) => {
                            const allRollosFIFO = inventoryStore.getRollosDisponiblesFIFO(
                              item.tela_id
                            );
                            const isExpanded = expandedTelaId === item.tela_id;
                            const precioLista = Number(item.precio_lista) || 12.5;

                            return (
                              <React.Fragment key={item.tela_id}>
                                <tr
                                  className={`hover:bg-blue-50/30 transition-colors ${
                                    item.alerta_reposicion ? 'bg-amber-50/20' : ''
                                  }`}
                                >
                                  {/* Cód. Color con desplegable de rollos */}
                                  <td className="py-3 pl-5 pr-2.5 whitespace-nowrap">
                                    <button
                                      onClick={() => toggleExpand(item.tela_id)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                                      title="Ver rollos físicos de este color"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-blue-300" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                      )}
                                      <span>{item.codigo_color}</span>
                                    </button>
                                  </td>

                                  {/* Nombre Comercial / Color */}
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

                                  {/* Precio Lista */}
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
                                    <span className="text-[11px] font-semibold text-blue-600 ml-0.5">
                                      m
                                    </span>
                                  </td>

                                  {/* Stock Mínimo */}
                                  <td className="py-3 px-2.5 text-right font-mono tabular-nums text-slate-500 text-xs whitespace-nowrap">
                                    {item.stock_minimo_alerta.toFixed(0)} m
                                  </td>

                                  {/* Estado */}
                                  <td className="py-3 px-2.5 text-center whitespace-nowrap">
                                    {item.alerta_reposicion ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200 whitespace-nowrap">
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

                                  {/* Acciones */}
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

                                      {onOpenIngresoConTela && (
                                        <button
                                          onClick={() => onOpenIngresoConTela(item.tela_id)}
                                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all whitespace-nowrap shadow-2xs cursor-pointer"
                                        >
                                          + Rollos
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleDeleteTela(item)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Eliminar este color"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Sub-tabla desplegable de rollos físicos del color */}
                                {isExpanded && (
                                  <tr>
                                    <td
                                      colSpan={9}
                                      className="bg-slate-50/70 p-0 border-y border-slate-200"
                                    >
                                      <div className="p-4 sm:p-5 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                            <Warehouse className="w-4 h-4 text-[#1a73e8]" />
                                            <span>
                                              Rollos Físicos Disponibles — Cód. Color{' '}
                                              {item.codigo_color} ({item.color})
                                            </span>
                                          </h3>
                                        </div>

                                        {allRollosFIFO.length === 0 ? (
                                          <div className="text-center py-5 text-xs text-slate-500">
                                            No hay rollos físicos disponibles para este color.
                                          </div>
                                        ) : (
                                          <div className="border border-slate-200 rounded-xl bg-white overflow-x-auto max-h-96 overflow-y-auto shadow-2xs">
                                            <table className="w-full text-xs">
                                              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold sticky top-0 z-10">
                                                <tr>
                                                  <th className="py-2.5 px-3 text-left">Orden</th>
                                                  <th className="py-2.5 px-3 text-left">
                                                    Código de Rollo
                                                  </th>
                                                  <th className="py-2.5 px-3 text-right">
                                                    Metraje Exacto
                                                  </th>
                                                  <th className="py-2.5 px-3 text-left">
                                                    Lote / DUA
                                                  </th>
                                                  <th className="py-2.5 px-3 text-left">
                                                    Ubicación Almacén
                                                  </th>
                                                  <th className="py-2.5 px-3 text-left">
                                                    Fecha de Ingreso
                                                  </th>
                                                  <th className="py-2.5 px-3 text-right">
                                                    Acciones
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 font-mono">
                                                {allRollosFIFO.map((rollo, idx) => (
                                                  <tr
                                                    key={rollo.id}
                                                    className="hover:bg-blue-50/30"
                                                  >
                                                    <td className="py-2.5 px-3 text-[#1a73e8] font-bold">
                                                      #{idx + 1}
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
                                                      {new Date(
                                                        rollo.fecha_ingreso
                                                      ).toLocaleString('es-PE', {
                                                        dateStyle: 'short',
                                                        timeStyle: 'short',
                                                      })}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-sans">
                                                      <div className="flex items-center justify-end gap-1.5">
                                                        {onAgregarRolloAPos && (
                                                          <button
                                                            onClick={() => onAgregarRolloAPos(rollo)}
                                                            className={`px-3 py-1 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer transition ${
                                                              posCartRolloIds.includes(rollo.id)
                                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                                : 'bg-[#1a73e8] hover:bg-[#1557b0]'
                                                            }`}
                                                          >
                                                            <ShoppingCart className="w-3.5 h-3.5" />
                                                            <span>
                                                              {posCartRolloIds.includes(rollo.id)
                                                                ? 'En POS'
                                                                : '+ Armar Pedido'}
                                                            </span>
                                                          </button>
                                                        )}
                                                        {onVerTrazabilidadRollo && (
                                                          <button
                                                            onClick={() =>
                                                              onVerTrazabilidadRollo(
                                                                rollo.codigo_rollo
                                                              )
                                                            }
                                                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                            title="Ver trazabilidad"
                                                          >
                                                            <Search className="w-3.5 h-3.5" />
                                                          </button>
                                                        )}
                                                        {onVerEtiqueta && (
                                                          <button
                                                            onClick={() => onVerEtiqueta(rollo)}
                                                            className="p-1.5 text-[#1a73e8] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Imprimir etiqueta QR"
                                                          >
                                                            <Tag className="w-3.5 h-3.5" />
                                                          </button>
                                                        )}
                                                        <button
                                                          onClick={() => handleDeleteRollo(rollo)}
                                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                          title="Eliminar rollo"
                                                        >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                ))}
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
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
