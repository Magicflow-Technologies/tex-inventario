import React, { useState, useMemo } from 'react';
import { StockConsolidadoTela, PedidoCompleto, Cliente } from '../types/inventory';
import { inventoryStore, normalizeLinea, normalizeSpaces } from '../services/inventoryStore';
import {
  Search,
  XCircle,
  ShoppingBag,
  ChevronDown,
  Layers,
  Ruler,
  Plus,
  X,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Package,
  User,
  Tag,
} from 'lucide-react';

interface ConsultaStockMovilViewProps {
  stockList: StockConsolidadoTela[];
  clientes?: Cliente[];
  defaultRegistradoPor?: string;
  onPedidoCreado?: (pedido: PedidoCompleto) => void;
  onIrAPedidosPendientes?: () => void;
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

interface ItemPedidoPreliminar {
  id: string;
  tela: StockConsolidadoTela;
  modo: 'ROLLOS' | 'METROS';
  cantidadRollos: number;
  metrosEstimados: number;
  precioMetro: number;
  rolloIdsSeleccionados: string[];
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
  clientes = [],
  defaultRegistradoPor,
  onPedidoCreado,
  onIrAPedidosPendientes,
}) => {
  const [filtroLineaActiva, setFiltroLineaActiva] = useState<string>('TODAS');
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');
  // Por defecto cerrado: al hacer clic en "Línea ... (Código)" se despliegan los códigos de colores
  const [articulosAbiertos, setArticulosAbiertos] = useState<Record<string, boolean>>({});

  // Estado del modal "+ Armar Pedido"
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<StockConsolidadoTela | null>(
    null
  );
  const [modoPedido, setModoPedido] = useState<'ROLLOS' | 'METROS'>('ROLLOS');
  const [cantidadPedido, setCantidadPedido] = useState<string>('1');
  const [precioMetroInput, setPrecioMetroInput] = useState<string>('12.50');
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<string>('');
  const [clientePedido, setClientePedido] = useState<string>('');
  const [documentoCliente, setDocumentoCliente] = useState<string>('');
  const [telefonoCliente, setTelefonoCliente] = useState<string>('');

  const handleSeleccionarCliente = (id: string) => {
    setClienteIdSeleccionado(id);
    if (!id) return;
    const found = clientes.find((c) => c.id === id);
    if (found) {
      setClientePedido(found.razon_social);
      setDocumentoCliente(found.ruc);
      setTelefonoCliente(found.telefonos || '');
    }
  };

  // Carrito de pedido preliminar y modal de resumen
  const [pedidoActual, setPedidoActual] = useState<ItemPedidoPreliminar[]>([]);
  const [isResumenOpen, setIsResumenOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const mostrarToast = (mensaje: string) => {
    setToastMsg(mensaje);
    setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

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

      // Filtro por pestaña de línea (solo aplica si hay más de 1 línea real)
      if (
        filtroLineaActiva !== 'TODAS' &&
        lineaNorm.toLowerCase() !== filtroLineaActiva.toLowerCase()
      ) {
        return;
      }

      // Filtro predictivo por texto (artículo, nombre, código de color, color, línea, rollo o lote)
      if (search) {
        const rollosFIFO = inventoryStore.getRollosDisponiblesFIFO(item.tela_id);
        const matchRollo = rollosFIFO.some(
          (r) =>
            r.codigo_rollo.toLowerCase().includes(search) ||
            (r.lote && r.lote.toLowerCase().includes(search))
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

    // Ordenar variantes por Código de Color numérico/alfanumérico (2001, 2002, 2003...)
    return Array.from(mapGrupos.values()).map((g) => ({
      ...g,
      variantes: [...g.variantes].sort((a, b) =>
        (a.codigo_color || '').localeCompare(b.codigo_color || '', undefined, { numeric: true })
      ),
    }));
  }, [stockList, filtroLineaActiva, terminoBusqueda]);

  // Métricas globales de lo filtrado
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

  // Abrir el modal de "+ Armar Pedido" para una variante
  const abrirModalPedido = (variante: StockConsolidadoTela) => {
    if (variante.total_metros_disponibles <= 0) return;
    setVarianteSeleccionada(variante);
    setModoPedido('ROLLOS');
    setCantidadPedido('1');
    const precioCatalogo = Number(variante.precio_lista) || 12.5;
    setPrecioMetroInput(precioCatalogo.toFixed(2));
  };

  const cerrarModalPedido = () => {
    setVarianteSeleccionada(null);
  };

  const cambiarModoPedido = (nuevoModo: 'ROLLOS' | 'METROS') => {
    setModoPedido(nuevoModo);
    if (!varianteSeleccionada) return;
    if (nuevoModo === 'ROLLOS') {
      setCantidadPedido('1');
    } else {
      const rollosFIFO = inventoryStore.getRollosDisponiblesFIFO(varianteSeleccionada.tela_id);
      const primerRolloMetros =
        rollosFIFO.length > 0
          ? rollosFIFO[0].metraje
          : Math.min(50, varianteSeleccionada.total_metros_disponibles);
      setCantidadPedido(String(primerRolloMetros));
    }
  };

  const ajustarCantidadPedido = (delta: number) => {
    if (!varianteSeleccionada) return;
    let val = parseFloat(cantidadPedido) || 0;
    val += delta;
    if (val < 1) val = 1;

    if (modoPedido === 'ROLLOS' && val > varianteSeleccionada.total_rollos_disponibles) {
      val = varianteSeleccionada.total_rollos_disponibles;
    }
    if (modoPedido === 'METROS' && val > varianteSeleccionada.total_metros_disponibles) {
      val = varianteSeleccionada.total_metros_disponibles;
    }
    setCantidadPedido(modoPedido === 'ROLLOS' ? String(Math.round(val)) : val.toFixed(2));
  };

  // Cálculo equivalente en el modal
  const calculoEquivalente = useMemo(() => {
    if (!varianteSeleccionada) return { rollosCount: 0, metrosAprox: 0, rolloIds: [] as string[] };
    const rollosFIFO = inventoryStore.getRollosDisponiblesFIFO(varianteSeleccionada.tela_id);
    const val = Math.max(0.1, parseFloat(cantidadPedido) || 1);

    if (modoPedido === 'ROLLOS') {
      const count = Math.min(Math.max(1, Math.round(val)), rollosFIFO.length);
      const seleccionados = rollosFIFO.slice(0, count);
      const sumaMetros = seleccionados.reduce((acc, r) => acc + r.metraje, 0);
      return {
        rollosCount: count,
        metrosAprox: sumaMetros,
        rolloIds: seleccionados.map((r) => r.id),
      };
    } else {
      // Seleccionar rollos FIFO hasta cubrir los metros solicitados
      const seleccionados: typeof rollosFIFO = [];
      let acumulado = 0;
      for (const r of rollosFIFO) {
        if (acumulado < val) {
          seleccionados.push(r);
          acumulado += r.metraje;
        } else {
          break;
        }
      }
      return {
        rollosCount: seleccionados.length,
        metrosAprox: acumulado,
        rolloIds: seleccionados.map((r) => r.id),
      };
    }
  }, [varianteSeleccionada, modoPedido, cantidadPedido]);

  const confirmarAgregarAlPedido = () => {
    if (!varianteSeleccionada || calculoEquivalente.rolloIds.length === 0) return;
    const precio = Math.max(0.1, parseFloat(precioMetroInput) || 12.5);

    const nuevoItem: ItemPedidoPreliminar = {
      id: `item_${Date.now()}`,
      tela: varianteSeleccionada,
      modo: modoPedido,
      cantidadRollos: calculoEquivalente.rollosCount,
      metrosEstimados: calculoEquivalente.metrosAprox,
      precioMetro: precio,
      rolloIdsSeleccionados: calculoEquivalente.rolloIds,
    };

    // Reemplazar si ya estaba la misma tela o agregar
    setPedidoActual((prev) => {
      const sinMismaTela = prev.filter((x) => x.tela.tela_id !== varianteSeleccionada.tela_id);
      return [...sinMismaTela, nuevoItem];
    });

    const colorNombre = varianteSeleccionada.color;
    const cantTexto =
      modoPedido === 'ROLLOS'
        ? `${calculoEquivalente.rollosCount} rollo(s)`
        : `${calculoEquivalente.metrosAprox.toFixed(2)} m`;

    cerrarModalPedido();
    mostrarToast(`Se agregó ${cantTexto} de ${colorNombre} al pedido.`);
  };

  const actualizarPrecioEnCarrito = (itemId: string, nuevoValor: string) => {
    const num = parseFloat(nuevoValor);
    if (Number.isNaN(num) || num <= 0) return;
    setPedidoActual((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, precioMetro: num } : item))
    );
  };

  const handleConfirmarOrdenDirecta = () => {
    if (pedidoActual.length === 0) return;
    const nombreClienteFinal = clientePedido.trim() || 'Cliente Mostrador';
    const itemsParaStore: Array<{ rollo_id: string; precio_metro: number }> = [];

    pedidoActual.forEach((item) => {
      item.rolloIdsSeleccionados.forEach((rId) => {
        itemsParaStore.push({
          rollo_id: rId,
          precio_metro: item.precioMetro,
        });
      });
    });

    try {
      const nuevoPedido = inventoryStore.crearOrdenPedido({
        cliente_nombre: nombreClienteFinal,
        cliente_documento: documentoCliente.trim() || 'S/D',
        cliente_telefono: telefonoCliente.trim() || undefined,
        observaciones: 'Generado desde Consulta de Stock',
        registrado_por: defaultRegistradoPor || 'Ventas 8tex',
        items: itemsParaStore,
      });

      setPedidoActual([]);
      setIsResumenOpen(false);
      mostrarToast(`¡Orden ${nuevoPedido.codigo_pedido} creada en Pedidos Pendientes!`);
      if (onPedidoCreado) onPedidoCreado(nuevoPedido);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al generar el pedido');
    }
  };

  const totalRollosPedido = pedidoActual.reduce((acc, i) => acc + i.cantidadRollos, 0);
  const totalMetrosPedido = pedidoActual.reduce((acc, i) => acc + i.metrosEstimados, 0);
  const totalSolesPedido = pedidoActual.reduce(
    (acc, i) => acc + i.metrosEstimados * i.precioMetro,
    0
  );

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
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30 uppercase tracking-wide">
                    Inventario Real
                  </span>
                  <span className="text-[10px] text-slate-400">· Rollo a Rollo</span>
                </div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                  Consulta de Stock
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (pedidoActual.length === 0) {
                  mostrarToast('El carrito de pedido está vacío. Toca "+ Pedir" en una tela.');
                } else {
                  setIsResumenOpen(true);
                }
              }}
              className="relative px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 active:scale-95 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-blue-300" />
              <span>Mi Pedido</span>
              {pedidoActual.length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {pedidoActual.length}
                </span>
              )}
            </button>
          </div>

          {/* Buscador Táctil Móvil */}
          <div className="px-4 pb-3.5 pt-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar artículo, color o código (ej: C-900, 4150, Silka)..."
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

            {/* Solo mostrar filtro de líneas si existen 2 o más líneas distintas */}
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
            <span className="text-slate-500 font-medium">Variantes:</span>
            <span className="font-extrabold text-slate-800">{totalVariantesColor} colores</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Disponible:</span>
            <span className="font-black text-blue-800 text-sm font-mono">
              {sumaMetrajeTotal.toFixed(2)}
            </span>
            <span className="font-bold text-blue-600 text-[10px]">m</span>
          </div>
        </section>

        {/* Lista Agrupada Móvil */}
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

                  {estaAbierto && (
                    <div className="divide-y divide-slate-100">
                      {grupo.variantes.map((v) => {
                        const tieneStock = v.total_metros_disponibles > 0;
                        const badgeHex = getColorHex(v.color);
                        const enCarrito = pedidoActual.some(
                          (item) => item.tela.tela_id === v.tela_id
                        );
                        const precioLista = Number(v.precio_lista) || 12.5;

                        return (
                          <div
                            key={v.tela_id}
                            className={`p-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition ${
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
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>
                                    {v.total_rollos_disponibles}{' '}
                                    {v.total_rollos_disponibles === 1 ? 'rollo' : 'rollos'}
                                  </span>
                                  <span>·</span>
                                  <span className="font-mono font-bold text-emerald-700">
                                    S/ {precioLista.toFixed(2)}/m
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
                                <span
                                  className={`text-[10px] font-medium ${
                                    tieneStock
                                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                      : 'text-slate-400 bg-slate-100'
                                  } px-1.5 py-0.5 rounded inline-block`}
                                >
                                  {tieneStock ? 'Disponible' : 'Sin Stock'}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={!tieneStock}
                                onClick={() => abrirModalPedido(v)}
                                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs transition active:scale-95 ${
                                  !tieneStock
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : enCarrito
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{enCarrito ? 'Listo' : 'Pedir'}</span>
                              </button>
                            </div>
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

        {/* Barra Flotante de Pedido Activo (Solo Móvil) */}
        {pedidoActual.length > 0 && (
          <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                Pedido en Armado ({pedidoActual.length}{' '}
                {pedidoActual.length === 1 ? 'variante' : 'variantes'})
              </span>
              <div className="text-sm font-black text-slate-900 font-mono">
                {totalRollosPedido} rollos · {totalMetrosPedido.toFixed(2)} m
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsResumenOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
            >
              <span>Confirmar Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================================
          VISTA 2: MODO COMPUTADORA / ESCRITORIO (hidden lg:block) — Vista amplia y completa
          ============================================================================ */}
      <div className="hidden lg:block space-y-6">
        {/* Cabecera Amplia de Escritorio (#0F284E) */}
        <div className="bg-[#0F284E] text-white rounded-3xl p-5 shadow-md border border-blue-900/50 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-black text-2xl text-blue-200 shadow-inner">
              8t
            </div>
            <div>
              <span className="text-sm font-black tracking-wider text-white uppercase">
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
                placeholder="Buscar por código de artículo (C-900), cód. color (4150), nombre, color, lote o rollo (ROL-...)..."
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

          {/* Indicadores Globales en Cabecera */}
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
          </div>
        </div>

        {/* Grilla Principal de 12 Columnas: Tabla Completa de Stock (12 cols cuando no hay pedido, 8+4 cuando hay pedido en armado) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* COLUMNA PRINCIPAL: Tabla Amplia Agrupada por Línea y Código de Artículo */}
          <div className={`${pedidoActual.length > 0 ? 'col-span-8' : 'col-span-12'} space-y-5`}>
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
                    {/* Cabecera Amplia del Artículo: Línea + (Código de Artículo) */}
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
                              {grupo.totalRollos} {grupo.totalRollos === 1 ? 'rollo físico' : 'rollos físicos'}
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

                    {/* Tabla Completa de Variantes de Color en Escritorio */}
                    {estaAbierto && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                              <th className="py-3 pl-6 pr-3">Cód. Color</th>
                              <th className="py-3 px-3">Artículo / Tela</th>
                              <th className="py-3 px-3">Variante de Color</th>
                              <th className="py-3 px-3 text-right">Precio Lista</th>
                              <th className="py-3 px-3">Rollos Físicos en Almacén</th>
                              <th className="py-3 px-3 text-right">Stock Disponible</th>
                              <th className="py-3 pl-3 pr-6 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {grupo.variantes.map((v) => {
                              const tieneStock = v.total_metros_disponibles > 0;
                              const badgeHex = getColorHex(v.color);
                              const enCarrito = pedidoActual.some(
                                (item) => item.tela.tela_id === v.tela_id
                              );
                              const precioLista = Number(v.precio_lista) || 12.5;
                              const rollosFIFO = inventoryStore.getRollosDisponiblesFIFO(v.tela_id);

                              return (
                                <tr
                                  key={v.tela_id}
                                  className={`transition ${
                                    tieneStock
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
                                        className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${
                                          tieneStock
                                            ? 'bg-slate-900 text-white border-slate-700'
                                            : 'bg-slate-200 text-slate-500 border-slate-300'
                                        }`}
                                      >
                                        {v.codigo_color}
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

                                  {/* Rollos Físicos Disponibles */}
                                  <td className="py-3.5 px-3">
                                    {rollosFIFO.length > 0 ? (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {rollosFIFO.slice(0, 4).map((r) => (
                                          <span
                                            key={r.id}
                                            className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-700"
                                            title={`${r.codigo_rollo} · Lote: ${r.lote || 'S/L'} · ${r.ubicacion || 'Almacén'}`}
                                          >
                                            {r.codigo_rollo.replace('ROL-2026-', '#')} ({Number(r.metraje).toFixed(0)}m)
                                          </span>
                                        ))}
                                        {rollosFIFO.length > 4 && (
                                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                            +{rollosFIFO.length - 4} más
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">
                                        0 rollos en almacén
                                      </span>
                                    )}
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
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                        tieneStock
                                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                          : 'text-slate-400 bg-slate-100'
                                      }`}
                                    >
                                      {v.total_rollos_disponibles}{' '}
                                      {v.total_rollos_disponibles === 1 ? 'rollo' : 'rollos'}
                                    </span>
                                  </td>

                                  {/* Botón + Armar Pedido */}
                                  <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      disabled={!tieneStock}
                                      onClick={() => abrirModalPedido(v)}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition active:scale-95 ${
                                        !tieneStock
                                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                          : enCarrito
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer'
                                      }`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>{enCarrito ? 'En Pedido' : 'Armar Pedido'}</span>
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
                );
              })
            )}
          </div>

          {/* COLUMNA DERECHA FIJA EN COMPUTADORA (4 COLUMNAS): Visible cuando se agregan colores al pedido */}
          {pedidoActual.length > 0 && (
          <div className="col-span-4 sticky top-20">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col">
              {/* Cabecera del Panel Derecho */}
              <div className="bg-[#0F284E] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight">Mi Pedido en Armado</h3>
                    <p className="text-[11px] text-blue-200">
                      {pedidoActual.length === 0
                        ? 'Haz clic en "+ Armar Pedido" en cualquier color'
                        : `${pedidoActual.length} variante(s) · ${totalRollosPedido} rollo(s)`}
                    </p>
                  </div>
                </div>
                {pedidoActual.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPedidoActual([])}
                    className="text-[11px] text-rose-300 hover:text-rose-200 font-bold px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-400/20 cursor-pointer"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {/* Selección de Cliente en el Panel Derecho */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-2.5">
                {clientes.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold text-blue-800 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Seleccionar Cliente Registrado:</span>
                    </label>
                    <select
                      value={clienteIdSeleccionado}
                      onChange={(e) => handleSeleccionarCliente(e.target.value)}
                      className="w-full bg-white text-xs font-semibold text-slate-900 rounded-xl p-2.5 border border-slate-300 focus:border-blue-500 focus:outline-none shadow-2xs"
                    >
                      <option value="">-- Elegir de la lista de Clientes --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razon_social} — RUC: {c.ruc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Razón Social / Cliente
                    </label>
                    <input
                      type="text"
                      value={clientePedido}
                      onChange={(e) => setClientePedido(e.target.value)}
                      placeholder="Ej. Confecciones Gamarra"
                      className="w-full bg-white text-xs font-semibold rounded-xl p-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      RUC / DNI
                    </label>
                    <input
                      type="text"
                      value={documentoCliente}
                      onChange={(e) => setDocumentoCliente(e.target.value)}
                      placeholder="Ej. 20601234567"
                      className="w-full bg-white text-xs font-mono font-semibold rounded-xl p-2 border border-slate-300 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Lista de Ítems en el Pedido */}
              <div className="p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
                {pedidoActual.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">
                      Aún no has seleccionado rollos para este pedido.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Usa el botón <strong>+ Armar Pedido</strong> en la tabla de la izquierda para elegir cantidad de rollos o metraje.
                    </p>
                  </div>
                ) : (
                  pedidoActual.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 truncate">
                            {item.tela.codigo} · {item.tela.nombre}
                          </div>
                          <div className="text-[11px] font-bold text-blue-700">
                            Cód. {item.tela.codigo_color} — {item.tela.color}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.cantidadRollos} rollo(s) · {item.metrosEstimados.toFixed(2)} m
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPedidoActual((prev) => prev.filter((x) => x.id !== item.id))
                          }
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Quitar del pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">Precio S/:</span>
                          <input
                            type="number"
                            step="0.10"
                            min="0.10"
                            value={item.precioMetro}
                            onChange={(e) => actualizarPrecioEnCarrito(item.id, e.target.value)}
                            className="w-20 text-right font-mono font-black text-xs bg-white border border-blue-400 rounded-lg py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">/m</span>
                        </div>
                        <div className="font-mono font-black text-slate-900 text-sm">
                          S/ {(item.metrosEstimados * item.precioMetro).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pie del Panel Derecho con Totales y Confirmación */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">
                    Total ({totalRollosPedido} rollos · {totalMetrosPedido.toFixed(2)} m):
                  </span>
                  <span className="text-lg font-black text-[#0F284E] font-mono">
                    S/ {totalSolesPedido.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={pedidoActual.length === 0}
                  onClick={handleConfirmarOrdenDirecta}
                  className={`w-full py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition ${
                    pedidoActual.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 cursor-pointer active:scale-98'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generar Orden de Pedido</span>
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ================= MODAL ERGONÓMICO '+ ARMAR PEDIDO' ================= */}
      {varianteSeleccionada && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={cerrarModalPedido}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border-t sm:border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Manija y Cabecera Modal */}
            <div className="p-4 pb-3 border-b border-slate-100">
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                      {varianteSeleccionada.codigo}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {varianteSeleccionada.linea || 'Moda Masculino'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">
                    {varianteSeleccionada.nombre}
                  </h3>
                  <p className="text-xs font-semibold text-blue-700">
                    {varianteSeleccionada.codigo_color} · {varianteSeleccionada.color}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrarModalPedido}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center active:scale-90 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal: Stock actual e inputs de pedido */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Tarjeta de Disponibilidad */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Stock Disponible Real:
                  </span>
                  <div className="text-lg font-black text-slate-900 flex items-baseline gap-1 font-mono">
                    <span>{varianteSeleccionada.total_metros_disponibles.toFixed(2)}</span>
                    <span className="text-xs text-blue-600 font-bold font-sans">m</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Físico en Almacén:
                  </span>
                  <div className="text-sm font-extrabold text-slate-700 flex items-center gap-1 justify-end">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>
                      {varianteSeleccionada.total_rollos_disponibles}{' '}
                      {varianteSeleccionada.total_rollos_disponibles === 1 ? 'rollo' : 'rollos'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selección de Método de Pedido */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Modo de Despacho:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cambiarModoPedido('ROLLOS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      modoPedido === 'ROLLOS'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Por Rollos Enteros</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarModoPedido('METROS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      modoPedido === 'METROS'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Por Metraje Exacto</span>
                  </button>
                </div>
              </div>

              {/* Input de Cantidad */}
              <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>
                    {modoPedido === 'ROLLOS' ? 'Rollos a solicitar:' : 'Metros a despachar:'}
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700">
                    {modoPedido === 'ROLLOS'
                      ? `Equivale a ${calculoEquivalente.metrosAprox.toFixed(2)} m (${calculoEquivalente.rollosCount} rollo/s FIFO)`
                      : `Se asignan ${calculoEquivalente.rollosCount} rollo(s) (${calculoEquivalente.metrosAprox.toFixed(2)} m)`}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => ajustarCantidadPedido(-1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 text-lg font-black active:scale-90 flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    -
                  </button>
                  <div className="relative w-32">
                    <input
                      type="number"
                      value={cantidadPedido}
                      min="1"
                      max={
                        modoPedido === 'ROLLOS'
                          ? varianteSeleccionada.total_rollos_disponibles
                          : varianteSeleccionada.total_metros_disponibles
                      }
                      step={modoPedido === 'ROLLOS' ? '1' : '0.5'}
                      onChange={(e) => setCantidadPedido(e.target.value)}
                      className="w-full text-center text-xl font-black text-slate-900 bg-white border-2 border-blue-500 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => ajustarCantidadPedido(1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 text-lg font-black active:scale-90 flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Precio por Metro y Cliente */}
              <div className="space-y-2.5">
                {clientes.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 mb-1">
                      Seleccionar Cliente Registrado:
                    </label>
                    <select
                      value={clienteIdSeleccionado}
                      onChange={(e) => handleSeleccionarCliente(e.target.value)}
                      className="w-full bg-blue-50/70 text-xs font-semibold text-slate-900 rounded-xl p-2.5 border border-blue-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Elegir cliente o escribir abajo --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razon_social} (RUC: {c.ruc})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Precio por Metro (S/.):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={precioMetroInput}
                      onChange={(e) => setPrecioMetroInput(e.target.value)}
                      className="w-full bg-slate-50 text-xs font-mono font-bold rounded-xl p-2.5 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Cliente / Cotización (Opcional):
                    </label>
                    <input
                      type="text"
                      value={clientePedido}
                      onChange={(e) => setClientePedido(e.target.value)}
                      placeholder="Ej. Confecciones D'Moda S.A.C."
                      className="w-full bg-slate-50 text-xs rounded-xl p-2.5 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del Modal con Confirmación de Pedido */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={cerrarModalPedido}
                className="w-1/3 py-3 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAgregarAlPedido}
                className="w-2/3 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/30 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar al Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE RESUMEN Y GENERACIÓN DE ORDEN ================= */}
      {isResumenOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsResumenOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Resumen de Pedido a Generar</h3>
                <p className="text-[11px] text-slate-500">
                  Se enviará directamente a la pestaña de Pedidos Pendientes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsResumenOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {clientes.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-blue-700 mb-1">
                    Seleccionar Cliente Registrado
                  </label>
                  <select
                    value={clienteIdSeleccionado}
                    onChange={(e) => handleSeleccionarCliente(e.target.value)}
                    className="w-full bg-blue-50/70 font-semibold text-slate-900 rounded-xl p-2.5 border border-blue-200 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Elegir de la lista de Clientes --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razon_social} — RUC: {c.ruc}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nombre / Razón Social *
                  </label>
                  <input
                    type="text"
                    value={clientePedido}
                    onChange={(e) => setClientePedido(e.target.value)}
                    placeholder="Ej. Confecciones D'Moda S.A.C."
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    RUC / DNI (Opcional)
                  </label>
                  <input
                    type="text"
                    value={documentoCliente}
                    onChange={(e) => setDocumentoCliente(e.target.value)}
                    placeholder="Ej. 20601234567"
                    className="w-full bg-slate-50 rounded-xl p-2.5 border border-slate-300 font-mono focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {pedidoActual.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {item.tela.codigo} · {item.tela.nombre}
                      </div>
                      <div className="text-[11px] text-blue-700 font-semibold">
                        Cód. {item.tela.codigo_color} - {item.tela.color}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {item.cantidadRollos} rollo(s) · {item.metrosEstimados.toFixed(2)} m × S/.{' '}
                        {item.precioMetro.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-black text-slate-900">
                        S/. {(item.metrosEstimados * item.precioMetro).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPedidoActual((prev) => prev.filter((x) => x.id !== item.id))
                        }
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsResumenOpen(false)}
                className="w-1/3 py-3 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Seguir Viendo
              </button>
              <button
                type="button"
                onClick={handleConfirmarOrdenDirecta}
                className="w-2/3 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Generar Orden de Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= NOTIFICACIÓN TOAST FLOTANTE ================= */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0F284E] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-blue-400/40 flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
          {onIrAPedidosPendientes && (
            <button
              type="button"
              onClick={onIrAPedidosPendientes}
              className="ml-1 underline text-blue-300 hover:text-white cursor-pointer"
            >
              Ver Pedidos
            </button>
          )}
        </div>
      )}
    </div>
  );
};
