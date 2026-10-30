import React, { useState } from 'react';
import { PedidoCompleto } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  Clock,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  X,
  Printer,
  ChevronDown,
  ChevronRight,
  Search,
  Building,
  Layers,
  Ban,
  Trash2,
  Plus,
  Receipt,
  Truck,
  UserCheck,
} from 'lucide-react';

interface PedidosPorFacturarViewProps {
  pedidos: PedidoCompleto[];
  defaultRegistradoPor?: string;
  onFacturacionExitosa: (pedido: PedidoCompleto, movimientoId: string) => void;
  onIrAPuntoVenta: () => void;
}

export const PedidosPorFacturarView: React.FC<PedidosPorFacturarViewProps> = ({
  pedidos,
  defaultRegistradoPor,
  onFacturacionExitosa,
  onIrAPuntoVenta,
}) => {
  const [filterEstado, setFilterEstado] = useState<'PENDIENTE' | 'FACTURADO' | 'TODOS'>('PENDIENTE');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(null);

  // Modal para confirmar factura y guía
  const [pedidoParaFacturar, setPedidoParaFacturar] = useState<PedidoCompleto | null>(null);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [registradoPor, setRegistradoPor] = useState(
    defaultRegistradoPor || 'Carlos Mendoza (Facturación)'
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para anular pedido
  const [pedidoParaAnular, setPedidoParaAnular] = useState<PedidoCompleto | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Modal de vista para impresión de Hoja de Pedido
  const [pedidoParaImprimir, setPedidoParaImprimir] = useState<PedidoCompleto | null>(null);

  const pendientesCount = pedidos.filter((p) => p.estado === 'PENDIENTE_FACTURACION').length;

  const filteredPedidos = pedidos.filter((p) => {
    const matchesEstado =
      filterEstado === 'TODOS' ||
      (filterEstado === 'PENDIENTE' && p.estado === 'PENDIENTE_FACTURACION') ||
      (filterEstado === 'FACTURADO' && p.estado === 'FACTURADO');

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.codigo_pedido.toLowerCase().includes(q) ||
      p.cliente_nombre.toLowerCase().includes(q) ||
      p.cliente_documento.toLowerCase().includes(q) ||
      (p.numero_factura && p.numero_factura.toLowerCase().includes(q)) ||
      (p.numero_guia && p.numero_guia.toLowerCase().includes(q));

    return matchesEstado && matchesSearch;
  });

  const handleOpenFacturarModal = (pedido: PedidoCompleto) => {
    setPedidoParaFacturar(pedido);
    setNumeroFactura(`F001-${String(Math.floor(1000 + Math.random() * 9000))}`);
    setNumeroGuia(`GR-001-${String(Math.floor(1000 + Math.random() * 9000))}`);
    setModalError(null);
  };

  const handleConfirmarFacturacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoParaFacturar) return;
    setModalError(null);

    if (!numeroFactura.trim()) {
      setModalError('Debe ingresar el número de Factura o Boleta SUNAT.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = inventoryStore.confirmarFacturacionPedido(pedidoParaFacturar.id, {
        numero_factura: numeroFactura,
        numero_guia: numeroGuia,
        registrado_por: registradoPor,
      });

      onFacturacionExitosa(res.pedido, res.movimientoId);
      setPedidoParaFacturar(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al confirmar la facturación';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePedido = (pedido: PedidoCompleto) => {
    const msg =
      pedido.estado === 'PENDIENTE_FACTURACION'
        ? `¿Estás seguro de eliminar el pedido ${pedido.codigo_pedido} de "${pedido.cliente_nombre}"?\n\nSus ${pedido.total_rollos} rollo(s) reservado(s) volverán a estar DISPONIBLES en inventario.`
        : `¿Estás seguro de eliminar permanentemente el registro del pedido ${pedido.codigo_pedido}?`;
    if (!window.confirm(msg)) return;
    try {
      inventoryStore.deletePedido(pedido.id);
      if (expandedPedidoId === pedido.id) setExpandedPedidoId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar pedido');
    }
  };

  const handleConfirmarAnulacion = () => {
    if (!pedidoParaAnular) return;
    try {
      inventoryStore.anularPedido(pedidoParaAnular.id, motivoAnulacion);
      setPedidoParaAnular(null);
      setMotivoAnulacion('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al anular pedido');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-[#1a73e8] text-xs font-semibold mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Flujo Comercial Desacoplado</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pedidos por Confirmar (Factura y Guía SUNAT)
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Órdenes de pedido generadas desde el POS con stock reservado. Al registrar la Factura y Guía de Remisión, se ejecuta la salida física oficial (OUT) en kárdex y se liberan las guías.
          </p>
        </div>

        <button
          onClick={onIrAPuntoVenta}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Pedido (POS)</span>
        </button>
      </div>

      {/* Selector de Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
          <button
            onClick={() => setFilterEstado('PENDIENTE')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              filterEstado === 'PENDIENTE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Por Confirmar Factura / Guía</span>
            <span className="font-mono px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
              {pendientesCount}
            </span>
          </button>
          <button
            onClick={() => setFilterEstado('FACTURADO')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterEstado === 'FACTURADO'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Facturados y Despachados
          </button>
          <button
            onClick={() => setFilterEstado('TODOS')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterEstado === 'TODOS'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({pedidos.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, cliente, RUC, factura..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Listado de Pedidos */}
      <div className="space-y-4">
        {filteredPedidos.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1a73e8] flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No hay pedidos en esta sección</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filterEstado === 'PENDIENTE'
                ? 'No tienes pedidos pendientes de facturación. Todo el stock reservado ha sido facturado o no hay pedidos activos en cola.'
                : 'No se encontraron pedidos que coincidan con la búsqueda actual.'}
            </p>
            {filterEstado === 'PENDIENTE' && (
              <button
                onClick={onIrAPuntoVenta}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Orden en Punto de Venta</span>
              </button>
            )}
          </div>
        ) : (
          filteredPedidos.map((pedido) => {
            const isPending = pedido.estado === 'PENDIENTE_FACTURACION';
            const isFacturado = pedido.estado === 'FACTURADO';
            const isAnulado = pedido.estado === 'ANULADO';
            const isExpanded = expandedPedidoId === pedido.id;

            return (
              <div
                key={pedido.id}
                className={`border rounded-2xl bg-white transition-all overflow-hidden ${
                  isPending
                    ? 'border-amber-300 shadow-md ring-1 ring-amber-100'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Cabecera de la Tarjeta del Pedido */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold font-mono text-slate-900">
                        {pedido.codigo_pedido}
                      </span>

                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pendiente Factura y Guía</span>
                        </span>
                      )}

                      {isFacturado && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Facturado y Despachado</span>
                        </span>
                      )}

                      {isAnulado && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                          <Ban className="w-3 h-3 text-rose-600" />
                          <span>Anulado (Rollos Liberados)</span>
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-mono">
                        · {new Date(pedido.created_at).toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{pedido.cliente_nombre}</span>
                      {pedido.cliente_documento && (
                        <span className="text-xs text-slate-500 font-mono font-normal">
                          (RUC/DNI: {pedido.cliente_documento})
                        </span>
                      )}
                    </div>

                    {/* Resumen de Documentos SUNAT si ya está facturado */}
                    {isFacturado && (
                      <div className="text-xs text-emerald-700 font-mono flex items-center gap-3 pt-0.5 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5" /> Factura: {pedido.numero_factura}
                        </span>
                        {pedido.numero_guia && (
                          <span className="inline-flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" /> Guía: {pedido.numero_guia}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Métricas y Acciones Principales */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-start md:self-auto">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-500 font-medium">
                        {pedido.total_rollos} rollos · {pedido.total_metros.toFixed(2)} m
                      </div>
                      <div className="text-xl font-mono font-black text-slate-900">
                        S/. {pedido.total_importe.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <button
                          onClick={() => handleOpenFacturarModal(pedido)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Confirmar Factura y Guía</span>
                        </button>
                      )}

                      <button
                        onClick={() => setPedidoParaImprimir(pedido)}
                        className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Imprimir Hoja de Pedido"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {isPending && (
                        <button
                          onClick={() => setPedidoParaAnular(pedido)}
                          className="p-2 text-slate-600 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
                          title="Anular Pedido y Liberar Rollos"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeletePedido(pedido)}
                        className="p-2 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar Pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setExpandedPedidoId(isExpanded ? null : pedido.id)}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{isExpanded ? 'Ocultar' : 'Ver Rollos'}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-tabla desplegable con el detalle de rollos físicos en el pedido */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#1a73e8]" />
                        <strong className="text-slate-900">Rollos físicos asignados a esta orden:</strong>
                      </div>
                      <div className="inline-flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vendedor: {pedido.registrado_por}</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Código Rollo</th>
                            <th className="py-2.5 px-3">Tela y Color</th>
                            <th className="py-2.5 px-3 text-right">Metraje Exacto</th>
                            <th className="py-2.5 px-3 text-right">Precio / Metro</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                            <th className="py-2.5 px-3">Ubicación Almacén</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {pedido.detalles.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-[#1a73e8]">
                                {item.codigo_rollo}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                                {item.tela_nombre} · {item.tela_color}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                                {item.metraje.toFixed(2)} m
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600">
                                S/. {item.precio_metro.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                                S/. {item.subtotal.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-600">
                                {item.ubicacion || 'Central'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {pedido.observaciones && (
                      <div className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
                        Observaciones: "{pedido.observaciones}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Confirmar Factura y Guía SUNAT */}
      {pedidoParaFacturar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Confirmar Facturación & Despacho
                  </h3>
                  <p className="text-xs text-slate-500">
                    Orden de Pedido: <span className="font-mono font-bold text-[#1a73e8]">{pedidoParaFacturar.codigo_pedido}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPedidoParaFacturar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarFacturacion} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Resumen del Pedido */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <strong className="text-slate-900">{pedidoParaFacturar.cliente_nombre}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rollos a despachar:</span>
                  <strong className="text-slate-900 font-mono">
                    {pedidoParaFacturar.total_rollos} rollos ({pedidoParaFacturar.total_metros.toFixed(2)} m)
                  </strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-700 font-bold">Total Factura:</span>
                  <strong className="text-emerald-700 font-mono font-bold text-base">
                    S/. {pedidoParaFacturar.total_importe.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Inputs de Factura y Guía SUNAT */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Número de Factura o Boleta SUNAT *
                  </label>
                  <input
                    type="text"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    placeholder="Ej. F001-0004523 o B001-001290"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Comprobante de pago electrónico emitido ante SUNAT.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Número de Guía de Remisión Remitente
                  </label>
                  <input
                    type="text"
                    value={numeroGuia}
                    onChange={(e) => setNumeroGuia(e.target.value)}
                    placeholder="Ej. GR-001-000942"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Documento de traslado para el transporte de los rollos de tela.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Responsable de Facturación / Entrega
                  </label>
                  <input
                    type="text"
                    value={registradoPor}
                    onChange={(e) => setRegistradoPor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Nota de impacto en inventario */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-[#1a73e8]">
                  Impacto en Almacén Físico:
                </div>
                <div>
                  Al confirmar, los {pedidoParaFacturar.total_rollos} rollos cambiarán su estado de{' '}
                  <span className="font-mono font-bold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">RESERVADO</span> a{' '}
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">VENDIDO</span>, y se insertará automáticamente el movimiento <span className="font-mono font-bold">OUT (VENTA)</span> en el Kárdex.
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPedidoParaFacturar(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Factura y Despachar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Anular Pedido */}
      {pedidoParaAnular && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <Ban className="w-5 h-5" />
              <span>¿Anular Orden {pedidoParaAnular.codigo_pedido}?</span>
            </div>

            <p className="text-slate-600">
              Esta acción anulará el pedido y liberará de inmediato los{' '}
              <strong className="text-slate-900 font-mono font-bold">{pedidoParaAnular.total_rollos} rollos</strong> de vuelta al estado{' '}
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">DISPONIBLE</span> para que puedan venderse a otro cliente.
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Motivo de Anulación:</label>
              <input
                type="text"
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ej. Cliente desistió de la compra / Falta de pago"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-3 focus:ring-rose-100 transition-all"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPedidoParaAnular(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl cursor-pointer"
              >
                No, volver
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnulacion}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Sí, Anular y Liberar Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Hoja de Pedido Imprimible */}
      {pedidoParaImprimir && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
              <span className="text-sm font-bold text-slate-900">Hoja de Pedido / Cotización Oficial</span>
              <button
                onClick={() => setPedidoParaImprimir(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div
                id="pedido-imprimible"
                className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 font-sans text-xs print:border-none print:shadow-none print:m-0"
              >
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#1a73e8] tracking-wider">
                      Textiles Ocho Lukal E.I.R.L.
                    </div>
                    <div className="text-xl font-black tracking-tight text-slate-900">
                      ORDEN DE PEDIDO
                    </div>
                    <div className="text-xs text-slate-600">Almacén Central de Telas (8tex)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-black text-slate-900">
                      {pedidoParaImprimir.codigo_pedido}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Fecha: {new Date(pedidoParaImprimir.created_at).toLocaleDateString('es-PE')}
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 font-mono">
                      Estado: {pedidoParaImprimir.estado}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Cliente / Razón Social:</span>
                    <strong className="text-sm text-slate-900">{pedidoParaImprimir.cliente_nombre}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RUC / DNI:</span>
                    <strong className="font-mono text-slate-900">{pedidoParaImprimir.cliente_documento || 'S/D'}</strong>
                  </div>
                  {pedidoParaImprimir.numero_factura && (
                    <div>
                      <span className="text-slate-500 block">N° Factura SUNAT:</span>
                      <strong className="font-mono text-emerald-700">{pedidoParaImprimir.numero_factura}</strong>
                    </div>
                  )}
                  {pedidoParaImprimir.numero_guia && (
                    <div>
                      <span className="text-slate-500 block">N° Guía Remisión:</span>
                      <strong className="font-mono text-slate-900">{pedidoParaImprimir.numero_guia}</strong>
                    </div>
                  )}
                </div>

                <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-2.5 border-r border-slate-200">Código Rollo</th>
                      <th className="py-2 px-2.5 border-r border-slate-200">Tela / Color</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-200">Metros</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-200">Precio/m</th>
                      <th className="py-2 px-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {pedidoParaImprimir.detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-2.5 font-bold border-r border-slate-200 text-[#1a73e8]">
                          {d.codigo_rollo}
                        </td>
                        <td className="py-2 px-2.5 font-sans border-r border-slate-200 text-slate-900">
                          {d.tela_nombre} · {d.tela_color}
                        </td>
                        <td className="py-2 px-2.5 text-right border-r border-slate-200 font-bold text-slate-900">
                          {d.metraje.toFixed(2)} m
                        </td>
                        <td className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-600">
                          S/. {d.precio_metro.toFixed(2)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                          S/. {d.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td colSpan={2} className="py-2.5 px-2.5 text-slate-900">
                        TOTAL ({pedidoParaImprimir.total_rollos} rollos)
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-900">
                        {pedidoParaImprimir.total_metros.toFixed(2)} m
                      </td>
                      <td className="py-2.5 px-2.5 text-right"></td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-base text-slate-900">
                        S/. {pedidoParaImprimir.total_importe.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {pedidoParaImprimir.observaciones && (
                  <div className="text-[11px] text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Notas: {pedidoParaImprimir.observaciones}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 mt-5 print:hidden">
                <button
                  onClick={() => setPedidoParaImprimir(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Documento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
