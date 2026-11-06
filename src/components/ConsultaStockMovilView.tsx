import React, { useState, useMemo } from 'react';
import { StockConsolidadoTela, RolloConTela } from '../types/inventory';
import { inventoryStore, normalizeLinea, normalizeSpaces } from '../services/inventoryStore';
import {
  Search,
  XCircle,
  ChevronDown,
  ChevronRight,
  Layers,
  ShoppingCart,
  Package,
  MapPin,
  Tag,
  Check,
} from 'lucide-react';

interface ConsultaStockMovilViewProps {
  stockList: StockConsolidadoTela[];
  posCartRolloIds?: string[];
  onAgregarRolloAPos?: (rollo: RolloConTela) => void;
  onIrAPos?: () => void;
}

interface GrupoArticulo {
  groupKey: string;
  linea: string;
  codigoArticulo: string;
  nombreBase: string;
  ancho: string;
  variantes: StockConsolidadoTela[];
  totalMetros: number;
  totalRollos: number;
}

function getColorHex(colorText?: string): string {
  const c = (colorText || '').toLowerCase();
  if (c.includes('negro')) return '#09090b';
  if (c.includes('azul noche')) return '#0f172a';
  if (c.includes('azul intermedio')) return '#1d4ed8';
  if (c.includes('azul marino')) return '#2563eb';
  if (c.includes('azul')) return '#2563eb';
  if (c.includes('charcoal sin puntos')) return '#475569';
  if (c.includes('charcoal')) return '#334155';
  if (c.includes('plomo cochino')) return '#64748b';
  if (c.includes('plomo intermedio')) return '#94a3b8';
  if (c.includes('plomo cenizo')) return '#a1a1aa';
  if (c.includes('plomo') || c.includes('gris')) return '#64748b';
  if (c.includes('silka') || c.includes('beige') || c.includes('arena')) return '#78716c';
  if (c.includes('grafito')) return '#52525b';
  if (c.includes('ginda') || c.includes('guinda') || c.includes('vino') || c.includes('rojo'))
    return '#881337';
  if (c.includes('verde')) return '#047857';
  if (c.includes('marron') || c.includes('marrón') || c.includes('cafe')) return '#78350f';
  return '#1d4ed8';
}

export const ConsultaStockMovilView: React.FC<ConsultaStockMovilViewProps> = ({
  stockList,
  posCartRolloIds = [],
  onAgregarRolloAPos,
  onIrAPos,
}) => {
  const [filtroLineaActiva, setFiltroLineaActiva] = useState<string>('TODAS');
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');

  // Nivel 1: "Línea ... (Código)" -> al hacer clic despliega los códigos de colores
  const [articulosAbiertos, setArticulosAbiertos] = useState<Record<string, boolean>>({});
  // Nivel 2: "Código de Color" -> al hacer clic despliega los rollos físicos que pertenecen a ese código
  const [coloresAbiertos, setColoresAbiertos] = useState<Record<string, boolean>>({});

  // Obtener todas las líneas únicas presentes en el inventario (normalizadas y sin duplicados)
  const lineasDisponibles = useMemo(() => {
    const mapLineas = new Map<string, string>();
    stockList.forEach((item) => {
      const l = normalizeLinea(item.linea);
      const key = l.toLowerCase();
      if (!mapLineas.has(key)) mapLineas.set(key, l);
    });
    return Array.from(mapLineas.values());
  }, [stockList]);

  // Agrupar stockList por (Línea Normalizada + Código de Artículo) sin duplicar
  const gruposFiltrados = useMemo(() => {
    const mapGrupos = new Map<string, GrupoArticulo>();
    const search = terminoBusqueda.trim().toLowerCase();

    stockList.forEach((item) => {
      const lineaNorm = normalizeLinea(item.linea);
      const codigoArtNorm = normalizeSpaces(item.codigo).toUpperCase();
      const nombreLimpio = normalizeSpaces(item.nombre).replace(/8Tex/g, '8tex');

      if (
        filtroLineaActiva !== 'TODAS' &&
        lineaNorm.toLowerCase() !== filtroLineaActiva.toLowerCase()
      ) {
        return;
      }

      if (search) {
        const rollosFIFO = inventoryStore.getRollosDisponiblesFIFO(item.tela_id);
        const matchRollo = rollosFIFO.some(
          (r) =>
            r.codigo_rollo.toLowerCase().includes(search) ||
            (r.lote && r.lote.toLowerCase().includes(search)) ||
            (r.ubicacion && r.ubicacion.toLowerCase().includes(search))
        );
        const matchTexto =
          codigoArtNorm.toLowerCase().includes(search) ||
          item.codigo_color.toLowerCase().includes(search) ||
          nombreLimpio.toLowerCase().includes(search) ||
          item.color.toLowerCase().includes(search) ||
          lineaNorm.toLowerCase().includes(search) ||
          matchRollo;

        if (!matchTexto) return;
      }

      const groupKey = `${lineaNorm.toLowerCase()}__${codigoArtNorm}`;
      const existing = mapGrupos.get(groupKey);

      if (!existing) {
        mapGrupos.set(groupKey, {
          groupKey,
          linea: lineaNorm,
          codigoArticulo: codigoArtNorm,
          nombreBase: nombreLimpio,
          ancho: `${(Number(item.ancho) || 1.6).toFixed(2)} m`,
          variantes: [{ ...item, nombre: nombreLimpio, linea: lineaNorm }],
          totalMetros: item.total_metros_disponibles,
          totalRollos: item.total_rollos_disponibles,
        });
      } else {
        existing.variantes.push({ ...item, nombre: nombreLimpio, linea: lineaNorm });
        existing.totalMetros += item.total_metros_disponibles;
        existing.totalRollos += item.total_rollos_disponibles;
        const partesActuales = existing.nombreBase
          .split(' / ')
          .map((p) => normalizeSpaces(p).toLowerCase());
        if (!partesActuales.includes(nombreLimpio.toLowerCase())) {
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
  }, [stockList, filtroLineaActiva, terminoBusqueda]);

  // Métricas globales
  const totalArticulos = gruposFiltrados.length;
  const totalVariantesColor = gruposFiltrados.reduce((acc, g) => acc + g.variantes.length, 0);
  const totalRollosGlobal = gruposFiltrados.reduce((acc, g) => acc + g.totalRollos, 0);
  const sumaMetrajeTotal = gruposFiltrados.reduce((acc, g) => acc + g.totalMetros, 0);

  const toggleArticulo = (groupKey: string) => {
    setArticulosAbiertos((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const toggleColor = (telaId: string) => {
    setColoresAbiertos((prev) => ({
      ...prev,
      [telaId]: !prev[telaId],
    }));
  };

  return (
    <div className="w-full select-none">
      {/* ============================================================================
          VISTA 1: MODO CELULAR (lg:hidden) — Diseño compacto para una mano
          ============================================================================ */}
      <div className="lg:hidden max-w-md mx-auto bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/90 shadow-md">
        {/* TOP APP BAR MÓVIL (#0F284E) */}
        <header className="bg-[#0F284E] text-white shadow-md border-b border-blue-900/50">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-black text-lg text-blue-200 shadow-inner">
                8t
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                  Consulta de Stock
                </h1>
              </div>
            </div>

            {posCartRolloIds.length > 0 && onIrAPos && (
              <button
                type="button"
                onClick={onIrAPos}
                className="relative px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Carrito POS ({posCartRolloIds.length})</span>
              </button>
            )}
          </div>

          {/* Buscador Táctil Móvil */}
          <div className="px-4 pb-3.5 pt-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar artículo, color, rollo o lote..."
                className="w-full bg-[#0A1E3C] text-white placeholder-slate-400 rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium border border-blue-900/80 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
              />
              {terminoBusqueda && (
                <button
                  type="button"
                  onClick={() => setTerminoBusqueda('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {lineasDisponibles.length > 1 && (
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroLineaActiva('TODAS')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                    filtroLineaActiva === 'TODAS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Todas las Líneas
                </button>
                {lineasDisponibles.map((linea) => {
                  const isActiva = filtroLineaActiva.toLowerCase() === linea.toLowerCase();
                  return (
                    <button
                      key={linea}
                      type="button"
                      onClick={() => setFiltroLineaActiva(linea)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                        isActiva
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {linea}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* Métricas Globales Móvil */}
        <section className="px-4 py-2.5 bg-white border-b border-slate-200/90 shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Artículos:</span>
            <span className="font-extrabold text-slate-800">{totalArticulos}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">Colores:</span>
            <span className="font-extrabold text-slate-800">{totalVariantesColor}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Disponible:</span>
            <span className="font-black text-blue-800 text-sm font-mono">
              {sumaMetrajeTotal.toFixed(2)}
            </span>
            <span className="font-bold text-blue-600 text-[10px]">m</span>
          </div>
        </section>

        {/* Lista Jerárquica Móvil: Línea/Artículo -> Códigos de Color -> Rollos Físicos */}
        <div className="p-3 space-y-3">
          {gruposFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 space-y-2 border border-slate-200">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600">
                No se encontraron telas bajo este criterio de búsqueda.
              </p>
            </div>
          ) : (
            gruposFiltrados.map((grupo) => {
              const estaAbierto =
                Boolean(terminoBusqueda.trim()) || Boolean(articulosAbiertos[grupo.groupKey]);

              return (
                <div
                  key={grupo.groupKey}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* NIVEL 1: Línea + Código de Artículo */}
                  <div
                    onClick={() => toggleArticulo(grupo.groupKey)}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-2 border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="px-2.5 h-8 rounded-xl bg-blue-100 text-blue-700 font-mono text-xs font-black flex items-center justify-center shrink-0 border border-blue-200">
                        {grupo.codigoArticulo}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                          Línea {grupo.linea} ({grupo.codigoArticulo})
                        </h2>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[11px] font-semibold text-slate-600 truncate">
                            {grupo.nombreBase}
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold">
                            · {grupo.variantes.length} colores
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900 flex items-baseline justify-end gap-0.5 font-mono">
                          <span>{grupo.totalMetros.toFixed(2)}</span>
                          <span className="text-[10px] text-blue-600 font-bold font-sans">m</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-end gap-1">
                          <Layers className="w-3 h-3 text-blue-600" />
                          <span>
                            {grupo.totalRollos} {grupo.totalRollos === 1 ? 'rollo' : 'rollos'}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg bg-slate-200/60 flex items-center justify-center text-slate-600 text-xs transition-transform ${
                          estaAbierto ? 'rotate-180 bg-blue-100 text-blue-700' : ''
                        }`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* NIVEL 2: Códigos de Color (al hacer clic despliega sus rollos) */}
                  {estaAbierto && (
                    <div className="divide-y divide-slate-100">
                      {grupo.variantes.map((v) => {
                        const tieneStock = v.total_metros_disponibles > 0;
                        const badgeHex = getColorHex(v.color);
                        const precioLista = Number(v.precio_lista) || 12.5;
                        const rollosFIFO = inventoryStore.getRollosDisponiblesFIFO(v.tela_id);
                        const isColorAbierto = Boolean(coloresAbiertos[v.tela_id]);

                        return (
                          <div key={v.tela_id} className="bg-white">
                            {/* Fila del Código de Color */}
                            <div
                              onClick={() => toggleColor(v.tela_id)}
                              className={`p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-blue-50/30 transition ${
                                tieneStock ? 'bg-white' : 'opacity-65 bg-slate-50/30'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex flex-col items-center shrink-0">
                                  <span
                                    className={`px-2 py-1 rounded-lg text-xs font-black font-mono border ${
                                      tieneStock
                                        ? 'bg-slate-900 text-white border-slate-700'
                                        : 'bg-slate-200 text-slate-500 border-slate-300'
                                    }`}
                                  >
                                    {v.codigo_color}
                                  </span>
                                  <span
                                    className="w-4 h-1.5 rounded-full mt-1"
                                    style={{ backgroundColor: badgeHex }}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate">
                                    {v.nombre}
                                  </div>
                                  <div className="text-[11px] font-semibold text-blue-700 truncate">
                                    {v.color}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono font-bold text-emerald-700">
                                      S/ {precioLista.toFixed(2)}/m
                                    </span>
                                    <span>·</span>
                                    <span>
                                      {v.total_rollos_disponibles}{' '}
                                      {v.total_rollos_disponibles === 1 ? 'rollo' : 'rollos'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <div
                                    className={`text-sm font-black font-mono ${
                                      tieneStock ? 'text-slate-900' : 'text-slate-400'
                                    } flex items-baseline justify-end gap-0.5`}
                                  >
                                    <span>{v.total_metros_disponibles.toFixed(2)}</span>
                                    <span
                                      className={`text-[10px] font-bold font-sans ${
                                        tieneStock ? 'text-blue-600' : 'text-slate-400'
                                      }`}
                                    >
                                      m
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-blue-600">
                                    {isColorAbierto
                                      ? 'Ocultar rollos'
                                      : `Ver rollos (${rollosFIFO.length})`}
                                  </span>
                                </div>

                                <div
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-transform ${
                                    isColorAbierto
                                      ? 'rotate-180 bg-blue-100 text-blue-700'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </div>

                            {/* NIVEL 3: Rollos físicos del Código de Color (con botón + Armar Pedido en cada rollo) */}
                            {isColorAbierto && (
                              <div className="bg-slate-50/90 border-t border-slate-200/80 p-3 space-y-2 max-h-96 overflow-y-auto">
                                {rollosFIFO.length === 0 ? (
                                  <div className="text-center py-3 text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                                    Sin rollos físicos disponibles para este código de color.
                                  </div>
                                ) : (
                                  rollosFIFO.map((rollo, idx) => {
                                    const enCarritoPos = posCartRolloIds.includes(rollo.id);
                                    return (
                                      <div
                                        key={rollo.id}
                                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                              #{idx + 1}
                                            </span>
                                            <span className="font-mono font-bold text-slate-900 text-xs">
                                              {rollo.codigo_rollo}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                            <span className="font-mono font-semibold text-slate-700">
                                              Lote: {rollo.lote || 'S/L'}
                                            </span>
                                            <span>·</span>
                                            <span>{rollo.ubicacion || 'Almacén Central'}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="text-right font-mono font-black text-sm text-slate-900">
                                            {rollo.metraje.toFixed(2)}{' '}
                                            <span className="text-[10px] text-blue-600 font-sans">
                                              m
                                            </span>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onAgregarRolloAPos) onAgregarRolloAPos(rollo);
                                            }}
                                            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer ${
                                              enCarritoPos
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                          >
                                            {enCarritoPos ? (
                                              <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>En POS</span>
                                              </>
                                            ) : (
                                              <>
                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                <span>Armar Pedido</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================================
          VISTA 2: MODO COMPUTADORA / ESCRITORIO (hidden lg:block) — Tabla amplia a 12 columnas
          ============================================================================ */}
      <div className="hidden lg:block space-y-6">
        {/* Cabecera Amplia de Escritorio (#0F284E) */}
        <div className="bg-[#0F284E] text-white rounded-3xl p-5 shadow-md border border-blue-900/50 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-black text-xl text-blue-200 shadow-inner">
              8t
            </div>
            <div>
              <span className="text-base font-black tracking-wider text-white uppercase">
                Consulta de Stock
              </span>
            </div>
          </div>

          {/* Buscador Amplio de Escritorio */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar por línea, artículo (C-900), cód. color (2003), color, lote o rollo (ROL-...)..."
                className="w-full bg-[#0A1E3C] text-white placeholder-slate-400 rounded-2xl pl-11 pr-10 py-3 text-sm font-medium border border-blue-800/80 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
              />
              {terminoBusqueda && (
                <button
                  type="button"
                  onClick={() => setTerminoBusqueda('')}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Indicadores Globales en Cabecera + Acceso al Carrito POS si tiene rollos */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-[#0A1E3C] border border-blue-800/70 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Variantes / Rollos
              </span>
              <span className="text-sm font-black text-white font-mono">
                {totalVariantesColor} colores · {totalRollosGlobal} rollos
              </span>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                Total Disponible
              </span>
              <span className="text-base font-black text-white font-mono">
                {sumaMetrajeTotal.toFixed(2)}{' '}
                <span className="text-xs font-bold text-blue-300 font-sans">m</span>
              </span>
            </div>

            {posCartRolloIds.length > 0 && onIrAPos && (
              <button
                type="button"
                onClick={onIrAPos}
                className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Ver Carrito en POS ({posCartRolloIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabla Completa de Stock a Pantalla Completa (sin ventana lateral de Mi Pedido) */}
        <div className="space-y-5">
          {gruposFiltrados.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-2 border border-slate-200 shadow-xs">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">
                No se encontraron telas o rollos bajo este criterio de búsqueda.
              </p>
            </div>
          ) : (
            gruposFiltrados.map((grupo) => {
              const estaAbierto =
                Boolean(terminoBusqueda.trim()) || Boolean(articulosAbiertos[grupo.groupKey]);

              return (
                <div
                  key={grupo.groupKey}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden"
                >
                  {/* NIVEL 1: Cabecera Amplia del Artículo: Línea + (Código de Artículo) */}
                  <div
                    onClick={() => toggleArticulo(grupo.groupKey)}
                    className="px-6 py-4 bg-slate-50/90 hover:bg-blue-50/40 cursor-pointer flex items-center justify-between gap-4 border-b border-slate-200/80 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="px-3.5 h-10 rounded-xl bg-blue-100 text-blue-800 font-mono text-sm font-black flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                        {grupo.codigoArticulo}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-base font-black text-slate-900">
                            Línea {grupo.linea} ({grupo.codigoArticulo})
                          </h2>
                          <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {grupo.variantes.length} códigos de color
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            · Ancho: <strong className="text-slate-700">{grupo.ancho}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5 truncate">
                          {grupo.nombreBase}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900 font-mono">
                          {grupo.totalMetros.toFixed(2)}{' '}
                          <span className="text-xs text-blue-600 font-bold font-sans">m</span>
                        </div>
                        <div className="text-xs text-slate-500 font-bold flex items-center justify-end gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {grupo.totalRollos}{' '}
                            {grupo.totalRollos === 1 ? 'rollo físico' : 'rollos físicos'}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                          estaAbierto
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300/70'
                        }`}
                      >
                        <span>{estaAbierto ? 'Ocultar Colores' : 'Ver Colores'}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            estaAbierto ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* NIVEL 2: Tabla de Códigos de Color (al hacer clic en un código de color se despliegan sus rollos) */}
                  {estaAbierto && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/60 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                            <th className="py-3 pl-6 pr-3">Cód. Color</th>
                            <th className="py-3 px-3">Artículo / Tela</th>
                            <th className="py-3 px-3">Variante de Color</th>
                            <th className="py-3 px-3 text-right">Precio Lista</th>
                            <th className="py-3 px-3 text-right">Rollos en Almacén</th>
                            <th className="py-3 px-3 text-right">Stock Disponible</th>
                            <th className="py-3 pl-3 pr-6 text-right">Rollos del Color</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {grupo.variantes.map((v) => {
                            const tieneStock = v.total_metros_disponibles > 0;
                            const badgeHex = getColorHex(v.color);
                            const precioLista = Number(v.precio_lista) || 12.5;
                            const rollosFIFO = inventoryStore.getRollosDisponiblesFIFO(v.tela_id);
                            const isColorAbierto = Boolean(coloresAbiertos[v.tela_id]);

                            return (
                              <React.Fragment key={v.tela_id}>
                                {/* Fila del Código de Color (clic para desplegar sus rollos) */}
                                <tr
                                  onClick={() => toggleColor(v.tela_id)}
                                  className={`cursor-pointer transition ${
                                    isColorAbierto
                                      ? 'bg-blue-50/40'
                                      : tieneStock
                                      ? 'hover:bg-blue-50/30 bg-white'
                                      : 'bg-slate-50/40 opacity-65'
                                  }`}
                                >
                                  {/* Cód. Color */}
                                  <td className="py-3.5 pl-6 pr-3 whitespace-nowrap">
                                    <div className="inline-flex items-center gap-2">
                                      <span
                                        className="w-3 h-6 rounded-full shrink-0 border border-black/10"
                                        style={{ backgroundColor: badgeHex }}
                                      />
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${
                                          tieneStock
                                            ? 'bg-slate-900 text-white border-slate-700'
                                            : 'bg-slate-200 text-slate-500 border-slate-300'
                                        }`}
                                      >
                                        {isColorAbierto ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-blue-300" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                        )}
                                        <span>{v.codigo_color}</span>
                                      </span>
                                    </div>
                                  </td>

                                  {/* Artículo / Tela */}
                                  <td className="py-3.5 px-3">
                                    <div className="font-bold text-slate-900 text-xs">
                                      {v.nombre}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {v.codigo} · Ancho {Number(v.ancho || 1.6).toFixed(2)}m
                                    </div>
                                  </td>

                                  {/* Variante de Color */}
                                  <td className="py-3.5 px-3">
                                    <span className="font-extrabold text-blue-700 text-xs">
                                      {v.color}
                                    </span>
                                  </td>

                                  {/* Precio de Lista */}
                                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-black text-xs">
                                      S/ {precioLista.toFixed(2)}
                                      <span className="text-[10px] font-sans font-semibold text-emerald-600">
                                        /m
                                      </span>
                                    </span>
                                  </td>

                                  {/* Rollos en Almacén */}
                                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                    <span
                                      className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block font-mono ${
                                        tieneStock
                                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                          : 'text-slate-400 bg-slate-100'
                                      }`}
                                    >
                                      {v.total_rollos_disponibles}{' '}
                                      {v.total_rollos_disponibles === 1 ? 'rollo' : 'rollos'}
                                    </span>
                                  </td>

                                  {/* Stock Disponible */}
                                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                    <div
                                      className={`text-sm font-black font-mono ${
                                        tieneStock ? 'text-slate-900' : 'text-slate-400'
                                      }`}
                                    >
                                      {v.total_metros_disponibles.toFixed(2)}{' '}
                                      <span className="text-[10px] font-bold font-sans text-blue-600">
                                        m
                                      </span>
                                    </div>
                                  </td>

                                  {/* Desplegar Rollos del Color */}
                                  <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleColor(v.tela_id);
                                      }}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                                        isColorAbierto
                                          ? 'bg-blue-600 text-white shadow-2xs'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <span>
                                        {isColorAbierto
                                          ? 'Ocultar Rollos'
                                          : `Ver Rollos (${rollosFIFO.length})`}
                                      </span>
                                      <ChevronDown
                                        className={`w-3.5 h-3.5 transition-transform ${
                                          isColorAbierto ? 'rotate-180' : ''
                                        }`}
                                      />
                                    </button>
                                  </td>
                                </tr>

                                {/* NIVEL 3: Despliegue de Rollos Físicos que pertenecen a este Código de Color */}
                                {isColorAbierto && (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="bg-slate-50/80 p-0 border-y border-slate-200/90"
                                    >
                                      <div className="px-8 py-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                            <Layers className="w-4 h-4 text-blue-600" />
                                            <span>
                                              Rollos de Cód. Color {v.codigo_color} — {v.color} (
                                              {rollosFIFO.length}{' '}
                                              {rollosFIFO.length === 1
                                                ? 'rollo disponible'
                                                : 'rollos disponibles'}
                                              )
                                            </span>
                                          </div>
                                        </div>

                                        {rollosFIFO.length === 0 ? (
                                          <div className="p-5 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                                            No hay rollos físicos disponibles actualmente para este código de color.
                                          </div>
                                        ) : (
                                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-96 overflow-y-auto">
                                            <table className="w-full text-xs">
                                              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px] sticky top-0 z-10">
                                                <tr>
                                                  <th className="py-2.5 pl-4 pr-3 text-left">#</th>
                                                  <th className="py-2.5 px-3 text-left">
                                                    Código de Rollo
                                                  </th>
                                                  <th className="py-2.5 px-3 text-right">
                                                    Metraje Registrado
                                                  </th>
                                                  <th className="py-2.5 px-3 text-left">
                                                    Ubicación en Almacén
                                                  </th>
                                                  <th className="py-2.5 px-3 text-left">
                                                    Lote / DUA
                                                  </th>
                                                  <th className="py-2.5 pl-3 pr-4 text-right">
                                                    Acción (Carrito POS)
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100">
                                                {rollosFIFO.map((rollo, idx) => {
                                                  const enCarritoPos = posCartRolloIds.includes(
                                                    rollo.id
                                                  );

                                                  return (
                                                    <tr
                                                      key={rollo.id}
                                                      className="hover:bg-blue-50/30 transition"
                                                    >
                                                      <td className="py-2.5 pl-4 pr-3 font-mono font-bold text-blue-600">
                                                        #{idx + 1}
                                                      </td>
                                                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                                        {rollo.codigo_rollo}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                                                        {rollo.metraje.toFixed(2)}{' '}
                                                        <span className="text-[10px] font-bold text-blue-600 font-sans">
                                                          m
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                                                        <span className="inline-flex items-center gap-1">
                                                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                          <span>
                                                            {rollo.ubicacion || 'Almacén Central'}
                                                          </span>
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                                          <Tag className="w-3 h-3 text-slate-500" />
                                                          <span>{rollo.lote || 'S/L'}</span>
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            if (onAgregarRolloAPos) {
                                                              onAgregarRolloAPos(rollo);
                                                            }
                                                          }}
                                                          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer ${
                                                            enCarritoPos
                                                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                                          }`}
                                                        >
                                                          {enCarritoPos ? (
                                                            <>
                                                              <Check className="w-3.5 h-3.5" />
                                                              <span>En Carrito POS (Ver POS)</span>
                                                            </>
                                                          ) : (
                                                            <>
                                                              <ShoppingCart className="w-3.5 h-3.5" />
                                                              <span>+ Armar Pedido</span>
                                                            </>
                                                          )}
                                                        </button>
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
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
