import React, { useState, useMemo } from 'react';
import { StockConsolidadoTela, PedidoCompleto, Cliente } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
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
  const [articulosCerrados, setArticulosCerrados] = useState<Record<string, boolean>>({});

  // Estado del modal "+ Armar Pedido"
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<StockConsolidadoTela | null>(
    null
  );
  const [modoPedido, setModoPedido] = useState<'ROLLOS' | 'METROS'>('ROLLOS');
  const [cantidadPedido, setCantidadPedido] = useState<string>('1');
  const [precioMetroInput, setPrecioMetroInput] = useState<string>('28.00');
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

  // Obtener todas las líneas únicas presentes en el inventario
  const lineasDisponibles = useMemo(() => {
    const setLineas = new Set<string>();
    stockList.forEach((item) => {
      const l = (item.linea || 'General').trim();
      if (l) setLineas.add(l);
    });
    return Array.from(setLineas);
  }, [stockList]);

  // Agrupar stockList por (Línea + Código de Artículo) igual que la plantilla móvil
  const gruposFiltrados = useMemo(() => {
    const mapGrupos = new Map<string, GrupoArticulo>();
    const search = terminoBusqueda.trim().toLowerCase();

    stockList.forEach((item) => {
      const lineaNorm = (item.linea || 'General').trim();

      // Filtro por pestaña de línea
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
          item.codigo.toLowerCase().includes(search) ||
          item.codigo_color.toLowerCase().includes(search) ||
          item.nombre.toLowerCase().includes(search) ||
          item.color.toLowerCase().includes(search) ||
          lineaNorm.toLowerCase().includes(search) ||
          matchRollo;

        if (!matchTexto) return;
      }

      const groupKey = `${lineaNorm}_${item.codigo}`;
      const existing = mapGrupos.get(groupKey);

      if (!existing) {
        mapGrupos.set(groupKey, {
          groupKey,
          linea: lineaNorm,
          codigoArticulo: item.codigo,
          nombreBase: item.nombre,
          ancho: `${(Number(item.ancho) || 1.6).toFixed(2)} m`,
          variantes: [item],
          totalMetros: item.total_metros_disponibles,
          totalRollos: item.total_rollos_disponibles,
        });
      } else {
        existing.variantes.push(item);
        existing.totalMetros += item.total_metros_disponibles;
        existing.totalRollos += item.total_rollos_disponibles;
        if (!existing.nombreBase.toLowerCase().includes(item.nombre.toLowerCase())) {
          existing.nombreBase = `${existing.nombreBase} / ${item.nombre}`;
        }
      }
    });

    return Array.from(mapGrupos.values());
  }, [stockList, filtroLineaActiva, terminoBusqueda]);

  // Métricas globales de lo filtrado
  const totalArticulos = gruposFiltrados.length;
  const totalVariantesColor = gruposFiltrados.reduce((acc, g) => acc + g.variantes.length, 0);
  const sumaMetrajeTotal = gruposFiltrados.reduce((acc, g) => acc + g.totalMetros, 0);

  const toggleArticulo = (groupKey: string) => {
    setArticulosCerrados((prev) => ({
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
        rollosFIFO.length > 0 ? rollosFIFO[0].metraje : Math.min(50, varianteSeleccionada.total_metros_disponibles);
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
    const precio = Math.max(0.1, parseFloat(precioMetroInput) || 28);

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
        observaciones: 'Generado desde Consulta de Stock Móvil',
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

  return (
    <div className="max-w-3xl mx-auto bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/90 shadow-md select-none">
      {/* ================= TOP APP BAR (#0F284E) ================= */}
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

          {/* Carrito / Contador de Pedido Preliminar */}
          <button
            type="button"
            onClick={() => {
              if (pedidoActual.length === 0) {
                mostrarToast('El carrito de pedido está vacío. Toca "+ Armar Pedido" en una tela.');
              } else {
                setIsResumenOpen(true);
              }
            }}
            className="relative px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 active:scale-95 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-blue-300" />
            <span className="hidden sm:inline">Mi Pedido</span>
            {pedidoActual.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                {pedidoActual.length}
              </span>
            )}
          </button>
        </div>

        {/* ================= BARRA DE BÚSQUEDA TÁCTIL ================= */}
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

          {/* Filtro Horizontal de Líneas */}
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
        </div>
      </header>

      {/* ================= MÉTRICAS GLOBALES COMPACTAS ================= */}
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

      {/* ================= LISTA AGRUPADA (LÍNEA > ARTÍCULO > COLORES) ================= */}
      <div className="p-3 sm:p-4 space-y-3.5">
        {gruposFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 space-y-2 border border-slate-200">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-600">
              No se encontraron telas bajo este criterio de búsqueda.
            </p>
          </div>
        ) : (
          gruposFiltrados.map((grupo) => {
            const estaAbierto = !articulosCerrados[grupo.groupKey];

            return (
              <div
                key={grupo.groupKey}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
              >
                {/* Cabecera del Artículo (Acordeón táctil) */}
                <div
                  onClick={() => toggleArticulo(grupo.groupKey)}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-2 border-b border-slate-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="px-2.5 h-8 rounded-xl bg-blue-100 text-blue-700 font-mono text-xs font-black flex items-center justify-center shrink-0 border border-blue-200">
                      {grupo.codigoArticulo}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {grupo.linea}
                        </span>
                        <span className="text-[10px] text-slate-400">· Ancho: {grupo.ancho}</span>
                      </div>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                        {grupo.nombreBase}
                      </h2>
                    </div>
                  </div>

                  {/* Resumen de metros del artículo y Chevron */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-slate-900 flex items-baseline justify-end gap-0.5 font-mono">
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
                        estaAbierto ? 'rotate-180' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Contenido Desplegable: Variantes de Color */}
                {estaAbierto && (
                  <div className="divide-y divide-slate-100">
                    {grupo.variantes.map((v) => {
                      const tieneStock = v.total_metros_disponibles > 0;
                      const badgeHex = getColorHex(v.color);
                      const enCarrito = pedidoActual.some((item) => item.tela.tela_id === v.tela_id);

                      return (
                        <div
                          key={v.tela_id}
                          className={`p-3 sm:p-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition ${
                            tieneStock ? '' : 'opacity-65 bg-slate-50/30'
                          }`}
                        >
                          {/* Datos requeridos: Código Color, Nombre Tela/Color */}
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
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Layers className="w-3 h-3 text-slate-400" />
                                <span>
                                  {v.total_rollos_disponibles}{' '}
                                  {v.total_rollos_disponibles === 1
                                    ? 'rollo disponible'
                                    : 'rollos disponibles'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Total en Metraje y Botón Único: + Armar Pedido */}
                          <div className="flex items-center gap-2.5 shrink-0">
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
                              title={
                                tieneStock
                                  ? 'Seleccionar cantidad para armar pedido'
                                  : 'Sin stock físico disponible'
                              }
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {enCarrito ? 'En Pedido' : 'Armar Pedido'}
                              </span>
                              <span className="sm:hidden">{enCarrito ? 'Listo' : 'Pedir'}</span>
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

      {/* ================= BARRA FLOTANTE DE PEDIDO ACTIVO ================= */}
      {pedidoActual.length > 0 && (
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-lg">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
              Pedido en Armado ({pedidoActual.length}{' '}
              {pedidoActual.length === 1 ? 'variante' : 'variantes'})
            </span>
            <div className="text-sm font-black text-slate-900 font-mono">
              {pedidoActual.reduce((acc, i) => acc + i.cantidadRollos, 0)} rollos ·{' '}
              {pedidoActual.reduce((acc, i) => acc + i.metrosEstimados, 0).toFixed(2)} m
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

      {/* ================= MODAL ERGONÓMICO '+ ARMAR PEDIDO' (BOTTOM SHEET) ================= */}
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
                      {varianteSeleccionada.linea || 'General'}
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

              {/* Input de Cantidad con botones táctiles para el pulgar */}
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
