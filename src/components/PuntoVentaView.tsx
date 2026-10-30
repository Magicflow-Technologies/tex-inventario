import React, { useState, useMemo, useEffect } from 'react';
import { Tela, RolloConTela, PedidoCompleto } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  ShoppingCart,
  Layers,
  ScanBarcode,
  CheckCircle,
  Clock,
  Printer,
  Trash2,
  Building,
  ArrowRight,
  Warehouse,
  AlertCircle,
  FileText,
  Ruler,
  Check,
} from 'lucide-react';

interface PuntoVentaViewProps {
  telas: Tela[];
  initialTelaId?: string;
  defaultRegistradoPor?: string;
  onPedidoCreado: (pedido: PedidoCompleto) => void;
  onIrAPedidosPendientes: () => void;
}

interface CartItem {
  rollo: RolloConTela;
  precio_metro: number;
}

export const PuntoVentaView: React.FC<PuntoVentaViewProps> = ({
  telas,
  initialTelaId,
  defaultRegistradoPor,
  onPedidoCreado,
  onIrAPedidosPendientes,
}) => {
  // Filtros de stock
  const [selectedTelaId, setSelectedTelaId] = useState<string>(initialTelaId || 'ALL');
  const [searchRollQuery, setSearchRollQuery] = useState('');

  // Carrito de rollos seleccionados en el pedido
  const [cart, setCart] = useState<CartItem[]>([]);

  // Datos del Cliente y Cabecera del Pedido
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [registradoPor, setRegistradoPor] = useState(
    defaultRegistradoPor || 'Carlos Mendoza (Ventas)'
  );

  useEffect(() => {
    if (initialTelaId) {
      setSelectedTelaId(initialTelaId);
    }
  }, [initialTelaId]);

  useEffect(() => {
    if (defaultRegistradoPor) {
      setRegistradoPor(defaultRegistradoPor);
    }
  }, [defaultRegistradoPor]);

  // Precios sugeridos por tela
  const [preciosSugeridos] = useState<Record<string, number>>({
    'ART-TIZZ-001': 38.5,
    'ART-TIZZ-002': 38.5,
    'ART-DRIL-001': 24.0,
    'ART-DRIL-002': 22.5,
    'ART-POPL-001': 16.0,
    'ART-FRAN-001': 19.5,
  });

  const [pedidoReciente, setPedidoReciente] = useState<PedidoCompleto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rollos en estado DISPONIBLE en todo el almacén
  const allRollosConTela = useMemo(() => {
    return inventoryStore.getRollosConTela();
  }, [cart, pedidoReciente]);

  const rollosDisponibles = useMemo(() => {
    const cartIds = new Set(cart.map((c) => c.rollo.id));
    return allRollosConTela.filter(
      (r) => r.estado === 'DISPONIBLE' && !cartIds.has(r.id)
    );
  }, [allRollosConTela, cart]);

  // Rollos filtrados para exploración de stock
  const rollosFiltrados = useMemo(() => {
    return rollosDisponibles.filter((r) => {
      const matchesTela = selectedTelaId === 'ALL' || r.tela_id === selectedTelaId;
      const q = searchRollQuery.toLowerCase();
      const matchesSearch =
        r.codigo_rollo.toLowerCase().includes(q) ||
        r.tela_codigo.toLowerCase().includes(q) ||
        r.tela_codigo_color.toLowerCase().includes(q) ||
        r.tela_nombre.toLowerCase().includes(q) ||
        r.tela_color.toLowerCase().includes(q) ||
        (r.lote && r.lote.toLowerCase().includes(q)) ||
        (r.ubicacion && r.ubicacion.toLowerCase().includes(q));

      return matchesTela && matchesSearch;
    });
  }, [rollosDisponibles, selectedTelaId, searchRollQuery]);

  // Totales del Carrito
  const totalMetrosPedido = cart.reduce((acc, c) => acc + Number(c.rollo.metraje), 0);
  const totalImportePedido = cart.reduce(
    (acc, c) => acc + Number(c.rollo.metraje) * c.precio_metro,
    0
  );

  const handleAddToCart = (rollo: RolloConTela) => {
    const precioDefecto = preciosSugeridos[rollo.tela_codigo] || 25.0;
    setCart((prev) => [...prev, { rollo, precio_metro: precioDefecto }]);
    setErrorMsg(null);
  };

  const handleAddFirstFIFO = (telaId: string) => {
    const disponiblesTela = rollosDisponibles
      .filter((r) => r.tela_id === telaId)
      .sort((a, b) => new Date(a.fecha_ingreso).getTime() - new Date(b.fecha_ingreso).getTime());

    if (disponiblesTela.length > 0) {
      handleAddToCart(disponiblesTela[0]);
    }
  };

  const handleRemoveFromCart = (rolloId: string) => {
    setCart((prev) => prev.filter((item) => item.rollo.id !== rolloId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
  };

  const handleDeleteRolloFromStock = (rollo: RolloConTela) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar del inventario el rollo ${rollo.codigo_rollo} (${rollo.tela_nombre} - ${rollo.metraje.toFixed(2)} m)?`
      )
    )
      return;
    try {
      inventoryStore.deleteRollo(rollo.id);
      setCart((prev) => prev.filter((item) => item.rollo.id !== rollo.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar rollo');
    }
  };

  const handleUpdatePrice = (rolloId: string, precio: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.rollo.id === rolloId ? { ...item, precio_metro: Math.max(0, precio) } : item
      )
    );
  };

  const handleScanOrDirectCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRollQuery.trim()) return;

    const match = rollosDisponibles.find(
      (r) =>
        r.codigo_rollo.toUpperCase() === searchRollQuery.trim().toUpperCase() ||
        r.id === searchRollQuery.trim()
    );

    if (match) {
      handleAddToCart(match);
      setSearchRollQuery('');
    } else {
      setErrorMsg(`El rollo ${searchRollQuery} no está disponible en stock o ya fue agregado.`);
    }
  };

  const handleCrearPedido = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (cart.length === 0) {
      setErrorMsg('Debe agregar al menos un rollo de tela disponible en stock para armar el pedido.');
      return;
    }

    if (!clienteNombre.trim()) {
      setErrorMsg('Ingrese el Nombre o Razón Social del cliente.');
      return;
    }

    try {
      const nuevoPedido = inventoryStore.crearOrdenPedido({
        cliente_nombre: clienteNombre,
        cliente_documento: clienteDocumento,
        cliente_telefono: clienteTelefono,
        observaciones,
        registrado_por: registradoPor,
        items: cart.map((item) => ({
          rollo_id: item.rollo.id,
          precio_metro: item.precio_metro,
        })),
      });

      setPedidoReciente(nuevoPedido);
      setCart([]);
      onPedidoCreado(nuevoPedido);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar la orden de pedido';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header estilo Google / Steve Jobs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-[#1a73e8]" />
            <span>Punto de Venta (POS) & Armado de Pedidos</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Paso 1: Consulta de stock disponible · Paso 2: Selección de rollos físicos y cotización · Paso 3: Generación de Orden de Pedido.
          </p>
        </div>

        <button
          onClick={onIrAPedidosPendientes}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all whitespace-nowrap shadow-2xs hover:shadow-xs self-start sm:self-center"
        >
          <Clock className="w-4 h-4 text-[#1a73e8]" />
          <span>Ver Pedidos por Confirmar Factura/Guía</span>
        </button>
      </div>

      {/* Alerta de Pedido Creado con Éxito */}
      {pedidoReciente && (
        <div className="p-5 bg-[#e8f0fe] border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Orden de Pedido {pedidoReciente.codigo_pedido} Generada</span>
                <span className="text-[11px] font-mono font-bold text-[#1a73e8] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  RESERVADO
                </span>
              </div>
              <p className="text-slate-700 mt-1 text-xs">
                Cliente: <strong className="text-slate-900">{pedidoReciente.cliente_nombre}</strong> · {pedidoReciente.total_rollos} rollos (
                {pedidoReciente.total_metros.toFixed(2)} m) · Total: <strong className="text-slate-900 font-mono">S/. {pedidoReciente.total_importe.toFixed(2)}</strong>.
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                * Los rollos físicos han quedado en estado <strong>RESERVADO</strong>. Pasa a la sección de pedidos para ingresar el número de Factura y Guía SUNAT.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Nota</span>
            </button>
            <button
              onClick={onIrAPedidosPendientes}
              className="px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap shadow-xs active:scale-98"
            >
              <span>Ir a Facturar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Principal: Stock Disponible a la Izquierda / Armado de Pedido a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: Explorador de Stock en Tiempo Real */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#1a73e8]" />
                  <span>1. Explorador de Stock Físico Disponible</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualiza primero el stock y selecciona los rollos para cotizar.
                </p>
              </div>

              <div className="text-xs font-mono text-slate-600">
                <span className="text-slate-900 font-bold">{rollosDisponibles.length}</span> rollos disponibles
              </div>
            </div>

            {/* Filtros de Telas y Buscador tipo Google */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Filtrar por Artículo / Tela:
                </label>
                <select
                  value={selectedTelaId}
                  onChange={(e) => setSelectedTelaId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1a73e8] focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                >
                  <option value="ALL">Todas las Telas en Stock ({telas.length})</option>
                  {telas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} · {t.nombre} - Cód. Color {t.codigo_color || 'S/N'} ({t.linea || 'General'} · Ancho: {t.ancho || 1.5}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Escanear o buscar código de rollo:
                </label>
                <form onSubmit={handleScanOrDirectCode} className="relative">
                  <ScanBarcode className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchRollQuery}
                    onChange={(e) => setSearchRollQuery(e.target.value)}
                    placeholder="Ej. ROL-2026-00001 + Enter..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-16 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors"
                  >
                    Agregar
                  </button>
                </form>
              </div>
            </div>

            {/* Sugerencia FIFO de rotación */}
            {selectedTelaId !== 'ALL' && (
              <div className="flex items-center justify-between text-xs bg-[#e8f0fe]/60 p-3 rounded-xl border border-blue-200">
                <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-[#1a73e8]" />
                  <span>Sugerencia FIFO por Antigüedad:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAddFirstFIFO(selectedTelaId)}
                  className="px-3 py-1 text-xs bg-white hover:bg-blue-50 text-[#1967d2] border border-blue-300 font-semibold rounded-lg transition-all shadow-2xs"
                >
                  + Agregar Rollo Más Antiguo (FIFO)
                </button>
              </div>
            )}

            {/* Listado de Rollos Disponibles */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Código Rollo</th>
                      <th className="py-2.5 px-3">Artículo y Color</th>
                      <th className="py-2.5 px-3 text-right">Metros</th>
                      <th className="py-2.5 px-3">Ubicación / Lote</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {rollosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                          No hay rollos disponibles con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      rollosFiltrados.map((rollo) => (
                        <tr key={rollo.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#1a73e8]">
                            {rollo.codigo_rollo}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-semibold text-slate-900 truncate max-w-[170px]">
                              {rollo.tela_nombre}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Cód. {rollo.tela_codigo_color || '00'} · {rollo.tela_color} ({rollo.tela_codigo})
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums text-sm">
                            {rollo.metraje.toFixed(2)} m
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 text-[11px]">
                            <div>{rollo.ubicacion || 'Central'}</div>
                            <div className="text-slate-400 font-mono">{rollo.lote}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAddToCart(rollo)}
                                className="px-3 py-1.5 text-xs bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold rounded-xl transition-all whitespace-nowrap shadow-2xs hover:shadow-xs active:scale-98 cursor-pointer"
                              >
                                + Seleccionar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRolloFromStock(rollo)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar rollo del inventario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Cuadros de Entrada estilo Steve Jobs para Armado de Pedido */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleCrearPedido}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-2xs"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1a73e8]" />
                  <span>2. Armado de la Orden de Pedido</span>
                </h2>
                <span className="text-xs font-mono font-bold bg-[#e8f0fe] text-[#1967d2] px-2.5 py-0.5 rounded-full">
                  {cart.length} rollos
                </span>
              </div>

              {/* Datos del Cliente: Cuadros limpios de Steve Jobs */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cliente / Razón Social *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ej. Confecciones Gamarra Moda S.A.C."
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      RUC o DNI
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 20601234567"
                      value={clienteDocumento}
                      onChange={(e) => setClienteDocumento(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Teléfono Contacto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 998 123 456"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Observaciones / Condiciones de Entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Recojo en almacén / Transporte interprovincial"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Lista de Rollos en el Pedido */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Rollos en el Pedido:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">
                      {totalMetrosPedido.toFixed(2)} m total
                    </span>
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCart}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        title="Quitar todos los rollos seleccionados"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Vaciar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {cart.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                      Selecciona rollos disponibles del inventario físico a la izquierda para armar la orden.
                    </div>
                  ) : (
                    cart.map((item) => {
                      const subtotal = Number(item.rollo.metraje) * item.precio_metro;
                      return (
                        <div
                          key={item.rollo.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-mono font-bold text-[#1a73e8]">
                                {item.rollo.codigo_rollo}
                              </div>
                              <div className="font-semibold text-slate-900">
                                {item.rollo.tela_nombre}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Cód. {item.rollo.tela_codigo_color || '00'} · {item.rollo.tela_color} · {item.rollo.metraje.toFixed(2)} m
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.rollo.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Quitar rollo del pedido"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Quitar</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-600 font-medium">S/. / m:</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={item.precio_metro}
                                onChange={(e) =>
                                  handleUpdatePrice(item.rollo.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-blue-100"
                              />
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 mr-1">Subtotal:</span>
                              <strong className="font-mono text-slate-900 text-xs font-bold">
                                S/. {subtotal.toFixed(2)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Resumen Final: Cuadro destacado en azul pastel */}
              <div className="p-4 bg-[#e8f0fe] border border-blue-200 rounded-2xl space-y-1.5 text-xs shadow-2xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Rollos Físicos:</span>
                  <strong className="text-slate-900 font-mono font-bold">{cart.length} rollos</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Metraje Exacto:</span>
                  <strong className="text-slate-900 font-mono font-bold">{totalMetrosPedido.toFixed(2)} m</strong>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-blue-200/80 text-sm">
                  <span className="font-bold text-slate-800">Importe Total Orden:</span>
                  <strong className="text-2xl font-mono font-black text-[#1a73e8] tracking-tight">
                    S/. {totalImportePedido.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Botón Principal Steve Jobs */}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-40 disabled:hover:bg-[#1a73e8] rounded-xl shadow-xs hover:shadow-sm transition-all active:scale-98"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Generar Orden de Pedido ({cart.length} rollos)</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Al confirmar, el stock pasa a estado RESERVADO. Se emitirá factura y guía en el siguiente paso.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
