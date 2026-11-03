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
  CheckCircle2,
  Ban,
  RotateCcw,
  ShieldAlert,
  Lock,
  X,
  Eye,
  EyeOff,
  AlertCircle,
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

  // Modal de Anulación / Extorno (protegido para Gerente General / Administradores)
  const [movimientoAAnular, setMovimientoAAnular] = useState<MovimientoCompleto | null>(null);
  const [tipoExtorno, setTipoExtorno] = useState<'ANULACION_INGRESO' | 'AJUSTE_EGRESO'>(
    'ANULACION_INGRESO'
  );
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = inventoryStore.isCurrentUserAdmin();

  const filtered = movimientos.filter((m) => {
    const matchesTipo = filterTipo === 'ALL' || m.tipo_movimiento === filterTipo;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      m.documento_referencia.toLowerCase().includes(q) ||
      m.entidad_origen_destino.toLowerCase().includes(q) ||
      m.motivo.toLowerCase().includes(q) ||
      m.registrado_por.toLowerCase().includes(q) ||
      (m.observaciones && m.observaciones.toLowerCase().includes(q)) ||
      m.detalles.some(
        (d) =>
          d.codigo_rollo.toLowerCase().includes(q) ||
          d.tela_nombre.toLowerCase().includes(q) ||
          Boolean(d.lote && d.lote.toLowerCase().includes(q))
      );

    return matchesTipo && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedMovId((curr) => (curr === id ? null : id));
  };

  const handleOpenAnularModal = (e: React.MouseEvent, mov: MovimientoCompleto) => {
    e.stopPropagation();
    setMovimientoAAnular(mov);
    setTipoExtorno('ANULACION_INGRESO');
    setMotivoAnulacion('');
    setPasswordConfirmacion('');
    setShowPassword(false);
    setModalError(null);
  };

  const handleConfirmarAnulacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movimientoAAnular) return;
    setModalError(null);

    try {
      inventoryStore.anularMovimiento({
        movimientoId: movimientoAAnular.id,
        motivoAnulacion,
        tipoExtorno:
          movimientoAAnular.tipo_movimiento === 'IN' ? tipoExtorno : 'REINGRESO_ANULACION',
        passwordConfirmacion,
      });
      setMovimientoAAnular(null);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error al anular el movimiento');
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
            Historial transparente e inmutable de transacciones físicas (
            <span className="font-mono text-slate-700 font-semibold">movimientos_inventario</span>
            ). Las correcciones se registran mediante contraoperación (Anulación / Extorno) sin
            borrar jamás las filas originales.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setFilterTipo('ALL')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filterTipo === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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
            placeholder="Buscar por factura, guía, cliente, proveedor, motivo o código de rollo..."
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
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4">Responsable</th>
                {isAdmin && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-slate-400">
                    No hay movimientos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((mov) => {
                  const isExpanded = expandedMovId === mov.id;
                  const isIN = mov.tipo_movimiento === 'IN';
                  const isAnulado =
                    mov.estado === 'ANULADO' ||
                    Boolean(mov.observaciones && mov.observaciones.includes('[ESTADO: ANULADO'));
                  const isContraoperacion = [
                    'ANULACION_INGRESO',
                    'AJUSTE_EGRESO',
                    'REINGRESO_ANULACION',
                  ].includes(String(mov.motivo));

                  return (
                    <React.Fragment key={mov.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-blue-50/40'
                            : isAnulado
                              ? 'bg-rose-50/30 text-slate-500'
                              : isContraoperacion
                                ? 'bg-amber-50/30'
                                : ''
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
                            <span
                              className={`text-xs font-mono font-semibold ${
                                isContraoperacion ? 'text-amber-800 font-bold' : 'text-slate-800'
                              }`}
                            >
                              {mov.motivo}
                            </span>
                          </div>
                        </td>

                        <td
                          className={`py-3.5 px-4 font-mono text-xs font-bold ${
                            isAnulado ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {mov.documento_referencia}
                        </td>

                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          {mov.entidad_origen_destino}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {mov.total_rollos}
                        </td>

                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                            isAnulado
                              ? 'line-through text-slate-400'
                              : isContraoperacion && !isIN
                                ? 'text-rose-700'
                                : isContraoperacion && isIN
                                  ? 'text-emerald-700'
                                  : 'text-slate-900'
                          }`}
                        >
                          {isIN ? '+' : '-'}
                          {mov.total_metraje.toFixed(2)} m
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isAnulado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold">
                              <Ban className="w-3 h-3 text-rose-600" />
                              <span>ANULADO</span>
                            </span>
                          ) : isContraoperacion ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold">
                              <RotateCcw className="w-3 h-3 text-amber-700" />
                              <span>EXTORNO</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ACTIVO</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-xs">{mov.registrado_por}</td>

                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            {isAnulado ? (
                              <span className="text-[11px] font-semibold text-rose-600 italic">
                                Anulado
                              </span>
                            ) : isContraoperacion ? (
                              <span className="text-[11px] font-medium text-amber-700 italic">
                                Compensación
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleOpenAnularModal(e, mov)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                                title="Anular movimiento generando contraoperación auditable en el Kárdex"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Anular movimiento</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Detalles desplegables del movimiento */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={isAdmin ? 10 : 9}
                            className="bg-slate-50 p-0 border-y border-slate-200"
                          >
                            <div className="p-5 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                                <div>
                                  <strong className="text-slate-900">
                                    Rollos físicos involucrados en la transacción
                                  </strong>{' '}
                                  (ID Movimiento:{' '}
                                  <span className="font-mono text-slate-500">{mov.id}</span>)
                                </div>
                                {mov.observaciones && (
                                  <div className="italic text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                    Nota / Auditoría: "{mov.observaciones}"
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
                                      <tr
                                        key={det.id}
                                        className="hover:bg-slate-50 transition-colors"
                                      >
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

      {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN / EXTORNO (Solo Administradores / Gerente General) */}
      {movimientoAAnular && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Anular Movimiento (Contraoperación / Extorno)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Autorización exclusiva de Gerencia / Administración
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMovimientoAAnular(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarAnulacion} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Resumen del movimiento original */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Documento a anular:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {movimientoAAnular.documento_referencia}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Operación original:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {movimientoAAnular.tipo_movimiento} · {movimientoAAnular.motivo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Rollos y Metraje involucrado:</span>
                  <span className="font-mono font-bold text-[#1a73e8]">
                    {movimientoAAnular.total_rollos} rollo(s) ·{' '}
                    {movimientoAAnular.total_metraje.toFixed(2)} m
                  </span>
                </div>
              </div>

              {/* Explicación de la regla de negocio */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Acción Auditable en el Kárdex:</span>
                </div>
                {movimientoAAnular.tipo_movimiento === 'IN' ? (
                  <p className="text-[11px] leading-relaxed">
                    • La fila original <strong>no se borrará</strong>; cambiará su estado a{' '}
                    <strong>ANULADO</strong>.<br />• Se creará un movimiento de salida de
                    compensación que descontará los{' '}
                    <strong>{movimientoAAnular.total_metraje.toFixed(2)} m</strong> del stock
                    disponible.
                  </p>
                ) : (
                  <p className="text-[11px] leading-relaxed">
                    • La fila original <strong>no se borrará</strong>; cambiará su estado a{' '}
                    <strong>ANULADO</strong>.<br />• Se creará un movimiento de{' '}
                    <strong>REINGRESO_ANULACION</strong> devolviendo automáticamente los{' '}
                    <strong>{movimientoAAnular.total_rollos} rollo(s)</strong> a estado{' '}
                    <strong>DISPONIBLE</strong>.
                  </p>
                )}
              </div>

              {/* Selección de tipo de contraoperación si es un ingreso */}
              {movimientoAAnular.tipo_movimiento === 'IN' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipo de Contraoperación a registrar *
                  </label>
                  <select
                    value={tipoExtorno}
                    onChange={(e) =>
                      setTipoExtorno(
                        e.target.value as 'ANULACION_INGRESO' | 'AJUSTE_EGRESO'
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  >
                    <option value="ANULACION_INGRESO">
                      ANULACION_INGRESO (Anulación de Entrada)
                    </option>
                    <option value="AJUSTE_EGRESO">
                      AJUSTE_EGRESO (Ajuste por Error de Metraje / Ingreso)
                    </option>
                  </select>
                </div>
              )}

              {/* Motivo del error / anulación */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo del Error / Anulación *
                </label>
                <input
                  type="text"
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Ej. Se ingresaron 100 metros demás por error / Rollo equivocado en guía"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Clave de confirmación del Administrador / Gerente General */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clave de Confirmación de Administrador *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordConfirmacion}
                    onChange={(e) => setPasswordConfirmacion(e.target.value)}
                    placeholder="Ingrese su contraseña de administrador para autorizar"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMovimientoAAnular(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirmar Anulación y Extorno</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
