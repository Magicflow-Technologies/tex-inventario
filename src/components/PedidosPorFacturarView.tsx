import React, { useState } from 'react';
import { PedidoCompleto, FaseAprobacionPedido } from '../types/inventory';
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
  Calendar,
  Check,
} from 'lucide-react';

interface PedidosPorFacturarViewProps {
  pedidos: PedidoCompleto[];
  defaultRegistradoPor?: string;
  onFacturacionExitosa: (pedido: PedidoCompleto, movimientoId: string) => void;
  onIrAPuntoVenta: () => void;
}

interface EtapaConfig {
  id: FaseAprobacionPedido;
  step: number;
  shortLabel: string;
  fullLabel: string;
}

const ETAPAS_FLUJO: EtapaConfig[] = [
  {
    id: 'J_VENTAS_APROBADO',
    step: 1,
    shortLabel: 'J. Ventas / Aprob.',
    fullLabel: 'Jefe de Ventas / Aprobado',
  },
  {
    id: 'CREDITOS_APROBADO',
    step: 2,
    shortLabel: 'Créd. y Fin. / Aprob.',
    fullLabel: 'Créditos y Finanzas / Aprobado',
  },
  {
    id: 'ALMACEN_FACTURADO',
    step: 3,
    shortLabel: 'Almacén / Fact.',
    fullLabel: 'Almacén / Facturado',
  },
  {
    id: 'ALMACEN_DESPACHADO',
    step: 4,
    shortLabel: 'Almacén / Desp.',
    fullLabel: 'Almacén / Despachado',
  },
];

function getFaseActual(pedido: PedidoCompleto): FaseAprobacionPedido {
  if (pedido.fase_aprobacion) return pedido.fase_aprobacion;
  if (pedido.estado === 'FACTURADO') {
    return pedido.numero_guia ? 'ALMACEN_DESPACHADO' : 'ALMACEN_FACTURADO';
  }
  return 'J_VENTAS_APROBADO';
}

function getStepIndex(fase: FaseAprobacionPedido): number {
  const found = ETAPAS_FLUJO.find((e) => e.id === fase);
  return found ? found.step : 1;
}

function getFaseBadgeStyle(fase: FaseAprobacionPedido, estado: PedidoCompleto['estado']) {
  if (estado === 'ANULADO') {
    return {
      text: 'Anulado',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }
  switch (fase) {
    case 'J_VENTAS_PENDIENTE':
      return {
        text: 'J. Ventas / Pend.',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'J_VENTAS_APROBADO':
      return {
        text: 'J. Ventas / Aprob.',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    case 'CREDITOS_APROBADO':
      return {
        text: 'Créd. y Fin. / Aprob.',
        className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      };
    case 'ALMACEN_FACTURADO':
      return {
        text: 'Almacén / Fact.',
        className: 'bg-teal-50 text-teal-800 border-teal-200',
      };
    case 'ALMACEN_DESPACHADO':
      return {
        text: 'Almacén / Desp.',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    default:
      return {
        text: 'J. Ventas / Aprob.',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
      };
  }
}

export const PedidosPorFacturarView: React.FC<PedidosPorFacturarViewProps> = ({
  pedidos,
  defaultRegistradoPor,
  onFacturacionExitosa,
  onIrAPuntoVenta,
}) => {
  const [filterEstado, setFilterEstado] = useState<'PENDIENTE' | 'FACTURADO' | 'TODOS'>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(null);

  // Modal para confirmar factura y guía
  const [pedidoParaFacturar, setPedidoParaFacturar] = useState<PedidoCompleto | null>(null);
  const [faseDestinoFacturacion, setFaseDestinoFacturacion] = useState<
    'ALMACEN_FACTURADO' | 'ALMACEN_DESPACHADO'
  >('ALMACEN_FACTURADO');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [numeroGuia, setNumeroGuia] = useState('');
  const [registradoPor, setRegistradoPor] = useState(
    defaultRegistradoPor || 'Administrador General'
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para anular pedido
  const [pedidoParaAnular, setPedidoParaAnular] = useState<PedidoCompleto | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Modal de vista para impresión de Hoja de Pedido
  const [pedidoParaImprimir, setPedidoParaImprimir] = useState<PedidoCompleto | null>(null);

  const pendientesCount = pedidos.filter((p) => p.estado === 'PENDIENTE_FACTURACION').length;
  const despachadosCount = pedidos.filter((p) => p.estado === 'FACTURADO').length;

  const filteredPedidos = pedidos.filter((p) => {
    const matchesEstado =
      filterEstado === 'TODOS' ||
      (filterEstado === 'PENDIENTE' && p.estado === 'PENDIENTE_FACTURACION') ||
      (filterEstado === 'FACTURADO' && p.estado === 'FACTURADO');

    const q = searchQuery.toLowerCase();
    const faseBadge = getFaseBadgeStyle(getFaseActual(p), p.estado);
    const matchesSearch =
      !q ||
      p.codigo_pedido.toLowerCase().includes(q) ||
      p.cliente_nombre.toLowerCase().includes(q) ||
      p.cliente_documento.toLowerCase().includes(q) ||
      (p.registrado_por && p.registrado_por.toLowerCase().includes(q)) ||
      faseBadge.text.toLowerCase().includes(q) ||
      (p.numero_factura && p.numero_factura.toLowerCase().includes(q)) ||
      (p.numero_guia && p.numero_guia.toLowerCase().includes(q));

    return matchesEstado && matchesSearch;
  });

  const handleOpenFacturarModal = (
    pedido: PedidoCompleto,
    targetFase: 'ALMACEN_FACTURADO' | 'ALMACEN_DESPACHADO' = 'ALMACEN_FACTURADO'
  ) => {
    setPedidoParaFacturar(pedido);
    setFaseDestinoFacturacion(targetFase);
    setNumeroFactura(
      pedido.numero_factura || `F001-${String(Math.floor(1000 + Math.random() * 9000))}`
    );
    setNumeroGuia(
      pedido.numero_guia || `GR-001-${String(Math.floor(1000 + Math.random() * 9000))}`
    );
    setModalError(null);
  };

  const handleCambiarFase = (pedido: PedidoCompleto, nuevaFase: FaseAprobacionPedido) => {
    if (pedido.estado === 'ANULADO') return;

    // Si el pedido aún no está facturado y tocan Almacén/Fact. o Almacén/Desp., abrir modal de Factura/Guía
    if (
      pedido.estado === 'PENDIENTE_FACTURACION' &&
      (nuevaFase === 'ALMACEN_FACTURADO' || nuevaFase === 'ALMACEN_DESPACHADO')
    ) {
      handleOpenFacturarModal(pedido, nuevaFase);
      return;
    }

    try {
      inventoryStore.actualizarFasePedido(pedido.id, nuevaFase);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar fase');
    }
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
        fase_destino: faseDestinoFacturacion,
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header adaptable a celular y escritorio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1a73e8] text-[11px] sm:text-xs font-semibold mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Seguimiento de Órdenes y Aprobaciones</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pedidos Pendientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
            Órdenes realizadas por los vendedores con su fase de aprobación en tiempo real:{' '}
            <span className="font-semibold text-slate-700">J. Ventas / Aprob.</span> →{' '}
            <span className="font-semibold text-slate-700">Créd. y Fin. / Aprob.</span> →{' '}
            <span className="font-semibold text-slate-700">Almacén / Fact.</span> →{' '}
            <span className="font-semibold text-slate-700">Almacén / Desp.</span>
          </p>
        </div>

        <button
          onClick={onIrAPuntoVenta}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all whitespace-nowrap self-stretch sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Pedido (POS)</span>
        </button>
      </div>

      {/* Selector de Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setFilterEstado('TODOS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              filterEstado === 'TODOS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({pedidos.length})
          </button>
          <button
            onClick={() => setFilterEstado('PENDIENTE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterEstado === 'PENDIENTE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>En Proceso</span>
            <span className="font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {pendientesCount}
            </span>
          </button>
          <button
            onClick={() => setFilterEstado('FACTURADO')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterEstado === 'FACTURADO'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Fact. / Desp.</span>
            <span className="font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {despachadosCount}
            </span>
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente, vendedor, código, fase o factura..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Estado vacío */}
      {filteredPedidos.length === 0 ? (
        <div className="p-10 text-center border border-slate-200 rounded-2xl bg-white shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1a73e8] flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No hay órdenes de pedido registradas
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cuando un vendedor registre un pedido en el Punto de Venta (POS), aparecerá aquí con su cliente, cantidad, total, fecha, vendedor y fase de aprobación.
          </p>
          <button
            onClick={onIrAPuntoVenta}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Orden en Punto de Venta</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPedidos.map((pedido) => {
            const isPending = pedido.estado === 'PENDIENTE_FACTURACION';
            const isFacturado = pedido.estado === 'FACTURADO';
            const isAnulado = pedido.estado === 'ANULADO';
            const isExpanded = expandedPedidoId === pedido.id;
            const faseActual = getFaseActual(pedido);
            const currentStep = getStepIndex(faseActual);
            const badgeInfo = getFaseBadgeStyle(faseActual, pedido.estado);

            return (
              <div
                key={pedido.id}
                className={`border rounded-2xl bg-white transition-all overflow-hidden ${
                  isPending
                    ? 'border-blue-200/90 shadow-xs'
                    : isFacturado
                    ? 'border-emerald-200/90 shadow-xs'
                    : 'border-slate-200 opacity-85'
                }`}
              >
                {/* ================= CUERPO PRINCIPAL DEL PEDIDO (ADAPTABLE MÓVIL Y ESCRITORIO) ================= */}
                <div className="p-3.5 sm:p-5 space-y-3.5">
                  {/* Fila 1: Código, Fecha del Pedido, Fase Actual y Acciones Rápidas */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {pedido.codigo_pedido}
                      </span>

                      {/* Badge de Fase y Aprobación Abreviada */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border ${badgeInfo.className}`}
                      >
                        {isAnulado ? (
                          <Ban className="w-3.5 h-3.5 shrink-0" />
                        ) : currentStep >= 3 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{badgeInfo.text}</span>
                      </span>
                    </div>

                    {/* Acciones compactas */}
                    <div className="flex items-center gap-1.5 ml-auto">
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
                        className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar Pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fila 2: Grilla de los 5 Datos Clave a la Vista (Cliente, Cant. Total, Precio Total, Fecha, Vendedor) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50/90 p-3 rounded-xl border border-slate-200/80 text-xs">
                    {/* 1. Nombre de Cliente */}
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Cliente
                      </span>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{pedido.cliente_nombre}</span>
                      </div>
                      {pedido.cliente_documento && (
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Doc: {pedido.cliente_documento}
                        </span>
                      )}
                    </div>

                    {/* 2. Cantidad Total del Pedido */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Cant. Total
                      </span>
                      <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm mt-0.5">
                        {pedido.total_rollos} {pedido.total_rollos === 1 ? 'rollo' : 'rollos'}
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-blue-700 block">
                        {pedido.total_metros.toFixed(2)} m
                      </span>
                    </div>

                    {/* 3. Precio Total */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Precio Total
                      </span>
                      <div className="font-mono font-black text-slate-900 text-sm sm:text-base mt-0.5">
                        S/. {pedido.total_importe.toFixed(2)}
                      </div>
                      {pedido.numero_factura && (
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold block truncate">
                          Fact: {pedido.numero_factura}
                        </span>
                      )}
                    </div>

                    {/* 4. Fecha de Pedido */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Fecha Pedido
                      </span>
                      <div className="font-mono font-semibold text-slate-800 text-xs mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          {new Date(pedido.created_at).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {new Date(pedido.created_at).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* 5. Quién realizó el pedido (Vendedor) */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Realizado por
                      </span>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5 flex items-center gap-1 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{pedido.registrado_por}</span>
                      </div>
                      {pedido.numero_guia && (
                        <span className="text-[10px] font-mono text-slate-500 block truncate">
                          Guía: {pedido.numero_guia}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fila 3: Barra Interactiva de Fases y Aprobaciones (Abreviada para Celular y Escritorio) */}
                  {!isAnulado && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-600 uppercase tracking-wider">
                          Fase y Aprobación (toca para avanzar o aprobar):
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {ETAPAS_FLUJO.map((etapa) => {
                          const isCompleted = currentStep > etapa.step;
                          const isCurrent = currentStep === etapa.step;

                          return (
                            <button
                              key={etapa.id}
                              type="button"
                              onClick={() => handleCambiarFase(pedido, etapa.id)}
                              title={etapa.fullLabel}
                              className={`py-2 px-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                                isCurrent
                                  ? 'bg-[#e8f0fe] border-[#1a73e8] text-[#1967d2] font-bold shadow-2xs ring-1 ring-blue-400/40'
                                  : isCompleted
                                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 font-semibold hover:bg-emerald-100/70'
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span
                                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                    isCurrent
                                      ? 'bg-[#1a73e8] text-white'
                                      : isCompleted
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {isCompleted ? <Check className="w-2.5 h-2.5" /> : etapa.step}
                                </span>
                                <span className="text-[11px] truncate">{etapa.shortLabel}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fila 4: Botones de Operación y Desplegable de Rollos */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setExpandedPedidoId(isExpanded ? null : pedido.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#1a73e8]" />
                      <span>
                        {isExpanded
                          ? 'Ocultar Rollos'
                          : `Ver Rollos del Pedido (${pedido.total_rollos})`}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleOpenFacturarModal(pedido, 'ALMACEN_FACTURADO')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Facturar / Despachar</span>
                        </button>
                      )}

                      {isFacturado && faseActual === 'ALMACEN_FACTURADO' && (
                        <button
                          type="button"
                          onClick={() => handleCambiarFase(pedido, 'ALMACEN_DESPACHADO')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Marcar Almacén / Desp.</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ================= DETALLE DESPLEGABLE DE ROLLOS (ADAPTABLE A CELULAR Y ESCRITORIO) ================= */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-3.5 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#1a73e8]" />
                        <strong className="text-slate-900">
                          Rollos físicos asignados a esta orden:
                        </strong>
                      </div>
                      <div className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <UserCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
                        <span>Vendedor: {pedido.registrado_por}</span>
                      </div>
                    </div>

                    {/* Vista Móvil de Rollos del Pedido (sm:hidden) */}
                    <div className="sm:hidden space-y-2">
                      {pedido.detalles.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#1a73e8]">
                              {item.codigo_rollo}
                            </span>
                            <span className="font-mono font-black text-slate-900">
                              S/. {item.subtotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800">
                            {item.tela_nombre} · {item.tela_color}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                            <span>
                              {item.metraje.toFixed(2)} m × S/. {item.precio_metro.toFixed(2)}/m
                            </span>
                            <span className="font-sans">{item.ubicacion || 'Central'}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Vista Escritorio de Rollos del Pedido (hidden sm:block) */}
                    <div className="hidden sm:block border border-slate-200 rounded-xl bg-white overflow-x-auto shadow-2xs">
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
                        Observaciones: &ldquo;{pedido.observaciones}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Confirmar Factura y Guía SUNAT */}
      {pedidoParaFacturar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Confirmar Facturación & Despacho
                  </h3>
                  <p className="text-xs text-slate-500">
                    Orden:{' '}
                    <span className="font-mono font-bold text-[#1a73e8]">
                      {pedidoParaFacturar.codigo_pedido}
                    </span>
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

            <form onSubmit={handleConfirmarFacturacion} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Resumen del Pedido */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <strong className="text-slate-900">{pedidoParaFacturar.cliente_nombre}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendedor:</span>
                  <strong className="text-slate-700">{pedidoParaFacturar.registrado_por}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cantidad Total:</span>
                  <strong className="text-slate-900 font-mono">
                    {pedidoParaFacturar.total_rollos} rollos (
                    {pedidoParaFacturar.total_metros.toFixed(2)} m)
                  </strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-700 font-bold">Precio Total:</span>
                  <strong className="text-emerald-700 font-mono font-bold text-base">
                    S/. {pedidoParaFacturar.total_importe.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Selección de Fase de Almacén */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Fase de Almacén a registrar:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFaseDestinoFacturacion('ALMACEN_FACTURADO')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      faseDestinoFacturacion === 'ALMACEN_FACTURADO'
                        ? 'bg-teal-50 border-teal-500 text-teal-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-teal-600" />
                      <span>Almacén / Fact.</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 block mt-0.5">
                      Facturado, listo para despacho
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFaseDestinoFacturacion('ALMACEN_DESPACHADO')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      faseDestinoFacturacion === 'ALMACEN_DESPACHADO'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Almacén / Desp.</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 block mt-0.5">
                      Facturado y despachado
                    </span>
                  </button>
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    required
                  />
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Responsable de Facturación / Almacén
                  </label>
                  <input
                    type="text"
                    value={registradoPor}
                    onChange={(e) => setRegistradoPor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
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
                  className="px-5 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Registrar</span>
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
              <strong className="text-slate-900 font-mono font-bold">
                {pedidoParaAnular.total_rollos} rollos
              </strong>{' '}
              de vuelta al estado{' '}
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                DISPONIBLE
              </span>{' '}
              para que puedan venderse a otro cliente.
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Motivo de Anulación:
              </label>
              <input
                type="text"
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Ej. Cliente desistió de la compra / Falta de pago"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
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
              <span className="text-sm font-bold text-slate-900">
                Hoja de Pedido / Cotización Oficial
              </span>
              <button
                onClick={() => setPedidoParaImprimir(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div
                id="pedido-imprimible"
                className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 font-sans text-xs print:border-none print:shadow-none print:m-0"
              >
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#1a73e8] tracking-wider">
                      Textiles Ocho Lukal E.I.R.L.
                    </div>
                    <div className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                      ORDEN DE PEDIDO
                    </div>
                    <div className="text-xs text-slate-600">Almacén Central de Telas (8tex)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-mono font-black text-slate-900">
                      {pedidoParaImprimir.codigo_pedido}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Fecha: {new Date(pedidoParaImprimir.created_at).toLocaleDateString('es-PE')}
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 font-mono">
                      Fase: {getFaseBadgeStyle(getFaseActual(pedidoParaImprimir), pedidoParaImprimir.estado).text}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Cliente / Razón Social:</span>
                    <strong className="text-sm text-slate-900">
                      {pedidoParaImprimir.cliente_nombre}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RUC / DNI:</span>
                    <strong className="font-mono text-slate-900">
                      {pedidoParaImprimir.cliente_documento || 'S/D'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Realizado por (Vendedor):</span>
                    <strong className="text-slate-900">{pedidoParaImprimir.registrado_por}</strong>
                  </div>
                  {pedidoParaImprimir.numero_factura && (
                    <div>
                      <span className="text-slate-500 block">N° Factura SUNAT:</span>
                      <strong className="font-mono text-emerald-700">
                        {pedidoParaImprimir.numero_factura}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                      <tr>
                        <th className="py-2 px-2.5 border-r border-slate-200">Código Rollo</th>
                        <th className="py-2 px-2.5 border-r border-slate-200">Tela / Color</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-200">Metros</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-200">
                          Precio/m
                        </th>
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
                </div>

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
                  className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
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
