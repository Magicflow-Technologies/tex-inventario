import React, { useState, useMemo, useEffect } from 'react';
import { Tela, MotivoMovimientoOUT, RolloConTela } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  X,
  ArrowUpRight,
  CheckCircle,
  Search,
  ScanBarcode,
  Layers,
  FileCheck,
  AlertCircle,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SalidaMercaderiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  telas: Tela[];
  initialTelaId?: string;
  defaultRegistradoPor?: string;
  onSuccess: (movimientoId: string, countRollos: number) => void;
}

export const SalidaMercaderiaModal: React.FC<SalidaMercaderiaModalProps> = ({
  isOpen,
  onClose,
  telas,
  initialTelaId,
  defaultRegistradoPor,
  onSuccess,
}) => {
  // Cabecera OUT
  const [motivo, setMotivo] = useState<MotivoMovimientoOUT>('VENTA');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [entidadOrigenDestino, setEntidadOrigenDestino] = useState('');
  const [registradoPor, setRegistradoPor] = useState(
    defaultRegistradoPor || 'Carlos Mendoza (Jefe Almacén)'
  );
  const [observaciones, setObservaciones] = useState('');

  // Selector y Picking
  const [selectedTelaId, setSelectedTelaId] = useState<string>(
    initialTelaId || (telas.length > 0 ? telas[0].id : '')
  );
  const [scannerInput, setScannerInput] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Rollos seleccionados para salida (lista de IDs)
  const [selectedRolloIds, setSelectedRolloIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTelaId(initialTelaId || (telas.length > 0 ? telas[0].id : ''));
      setSelectedRolloIds([]);
      setDocumentoReferencia('');
      setEntidadOrigenDestino('');
      setObservaciones('');
      setScannerInput('');
      setScannerError(null);
      setErrorMsg(null);
      if (defaultRegistradoPor) setRegistradoPor(defaultRegistradoPor);
    }
  }, [isOpen, initialTelaId, defaultRegistradoPor]);

  // Rollos disponibles de la tela seleccionada ordenados por FIFO (Consulta 3)
  const rollosDisponiblesTela = useMemo(() => {
    if (!selectedTelaId) return [];
    return inventoryStore.getRollosDisponiblesFIFO(selectedTelaId);
  }, [selectedTelaId, isOpen]);

  // Mapa de todos los rollos disponibles para resolución rápida
  const allRollosConTela = useMemo(() => {
    return inventoryStore.getRollosConTela();
  }, [isOpen]);

  const rollosSeleccionadosObjetos = useMemo(() => {
    return selectedRolloIds
      .map((id) => allRollosConTela.find((r) => r.id === id))
      .filter((r): r is RolloConTela => r !== undefined);
  }, [selectedRolloIds, allRollosConTela]);

  const totalMetrosDespacho = rollosSeleccionadosObjetos.reduce(
    (acc, r) => acc + Number(r.metraje),
    0
  );

  if (!isOpen) return null;

  const handleToggleSelectRollo = (rolloId: string) => {
    if (selectedRolloIds.includes(rolloId)) {
      setSelectedRolloIds(selectedRolloIds.filter((id) => id !== rolloId));
    } else {
      setSelectedRolloIds([...selectedRolloIds, rolloId]);
    }
  };

  const handleSelectFirstN = (n: number) => {
    const idsToAdd: string[] = [];
    for (let i = 0; i < Math.min(n, rollosDisponiblesTela.length); i++) {
      const rId = rollosDisponiblesTela[i].id;
      if (!selectedRolloIds.includes(rId)) {
        idsToAdd.push(rId);
      }
    }
    setSelectedRolloIds([...selectedRolloIds, ...idsToAdd]);
  };

  // Manejo de lectura de pistola/escáner de código de barras
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScannerError(null);
    const code = scannerInput.trim().toUpperCase();
    if (!code) return;

    const rollo = allRollosConTela.find(
      (r) => r.codigo_rollo.toUpperCase() === code || r.id === code
    );

    if (!rollo) {
      setScannerError(`Código ${code} no encontrado en la base de datos.`);
      return;
    }

    if (rollo.estado !== 'DISPONIBLE') {
      setScannerError(`El rollo ${rollo.codigo_rollo} no está disponible (Estado: ${rollo.estado}).`);
      return;
    }

    if (selectedRolloIds.includes(rollo.id)) {
      setScannerError(`El rollo ${rollo.codigo_rollo} ya fue añadido a este despacho.`);
      return;
    }

    setSelectedRolloIds([...selectedRolloIds, rollo.id]);
    setScannerInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedRolloIds.length === 0) {
      setErrorMsg('Debe seleccionar al menos un rollo para despachar.');
      return;
    }

    if (!entidadOrigenDestino.trim()) {
      setErrorMsg('Debe especificar el Cliente o Destinatario del despacho.');
      return;
    }

    if (!documentoReferencia.trim()) {
      setErrorMsg('Debe ingresar el Documento de Referencia (Factura / Pedido / Guía).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = inventoryStore.registrarSalida({
        motivo,
        documento_referencia: documentoReferencia,
        entidad_origen_destino: entidadOrigenDestino,
        observaciones,
        registrado_por: registradoPor,
        rolloIds: selectedRolloIds,
      });

      onSuccess(res.movimientoId, res.rollosDespachados.length);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar salida';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Flujo B: Salida de Mercadería / Despacho (OUT)
              </h2>
              <p className="text-xs text-slate-500">
                Picking asistido por FIFO (Consulta 3) o escaneo directo rollo a rollo con comprobante.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Cabecera del Movimiento OUT */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>1. Cabecera del Despacho (Comercial & SUNAT)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo de Salida *
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoMovimientoOUT)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="VENTA">VENTA (Despacho Comercial)</option>
                  <option value="MERMA">MERMA (Baja por Falla / Defecto)</option>
                  <option value="MUESTRA">MUESTRA (Corte o Envío Comercial)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Documento Referencia *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Factura F001-002950 / Pedido #512"
                  value={documentoReferencia}
                  onChange={(e) => setDocumentoReferencia(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente / Destinatario *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Confecciones Gamarra Moda S.A.C."
                  value={entidadOrigenDestino}
                  onChange={(e) => setEntidadOrigenDestino(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Despachado Por (Almacenero)
                </label>
                <input
                  type="text"
                  value={registradoPor}
                  onChange={(e) => setRegistradoPor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones de Entrega
                </label>
                <input
                  type="text"
                  placeholder="Ej. Retira transporte propio del cliente con placa ABC-123"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Selección de Rollos (Picking FIFO & Escáner) */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1a73e8]" />
                  <span>2. Selección de Rollos a Despachar</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Usa la rotación sugerida por antigüedad FIFO (Consulta 3) o escanea el código de barras del rollo físico.
                </p>
              </div>

              {/* Escáner rápido de código */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ScanBarcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1a73e8]" />
                  <input
                    type="text"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanSubmit(e);
                      }
                    }}
                    placeholder="Escanear rollo (ej. ROL-2026-00001)..."
                    className="bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 font-mono w-64 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleScanSubmit}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </div>

            {scannerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl">
                {scannerError}
              </div>
            )}

            {/* Split view: Picker FIFO por tela a la izquierda / Rollos en carrito de despacho a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Columna Izquierda: Picking Asistido FIFO por tela (Consulta 3) */}
              <div className="lg:col-span-7 border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Filtrar rollos disponibles por Tela:
                    </label>
                    <select
                      value={selectedTelaId}
                      onChange={(e) => setSelectedTelaId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1a73e8] cursor-pointer"
                    >
                      {telas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} - {t.color} ({t.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {rollosDisponiblesTela.length > 0 && (
                    <div className="flex items-end gap-1.5 pt-4">
                      <button
                        type="button"
                        onClick={() => handleSelectFirstN(1)}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl whitespace-nowrap cursor-pointer shadow-sm"
                        title="Seleccionar el rollo más antiguo (FIFO)"
                      >
                        + 1 FIFO
                      </button>
                      {rollosDisponiblesTela.length >= 3 && (
                        <button
                          type="button"
                          onClick={() => handleSelectFirstN(3)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl whitespace-nowrap cursor-pointer shadow-sm"
                        >
                          + 3 FIFO
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-600 flex items-center justify-between border-b border-slate-200 pb-2">
                  <span>
                    Rollos disponibles:{' '}
                    <strong className="text-slate-900 font-mono font-bold">{rollosDisponiblesTela.length}</strong>
                  </span>
                  <span className="text-[#1a73e8] font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Orden FIFO (Antigüedad ASC)</span>
                  </span>
                </div>

                {/* Listado Picking */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {rollosDisponiblesTela.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No hay rollos DISPONIBLES de esta tela en almacén.
                    </div>
                  ) : (
                    rollosDisponiblesTela.map((rollo, idx) => {
                      const isSelected = selectedRolloIds.includes(rollo.id);
                      return (
                        <div
                          key={rollo.id}
                          onClick={() => handleToggleSelectRollo(rollo.id)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 text-xs transition-all ${
                            isSelected
                              ? 'bg-blue-50/70 border-[#1a73e8] text-slate-900 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // controlado por div onClick
                              className="w-4 h-4 text-[#1a73e8] rounded focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">
                                  {rollo.codigo_rollo}
                                </span>
                                {idx === 0 && (
                                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold font-mono">
                                    [FIFO #1 Sugerido]
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Ubic: {rollo.ubicacion || 'Almacén Central'} · Lote: {rollo.lote || 'STD'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-slate-900 tabular-nums">
                              {rollo.metraje.toFixed(2)} m
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Ingreso:{' '}
                              {new Date(rollo.fecha_ingreso).toLocaleDateString('es-PE', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Columna Derecha: Rollos Seleccionados para el Despacho */}
              <div className="lg:col-span-5 border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Rollos en Orden de Despacho
                    </span>
                    <span className="text-xs font-mono font-bold text-[#1a73e8]">
                      {selectedRolloIds.length} rollos
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {rollosSeleccionadosObjetos.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400">
                        Selecciona rollos de la lista FIFO a la izquierda o escanea sus códigos de barra.
                      </div>
                    ) : (
                      rollosSeleccionadosObjetos.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-sm"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-900">{r.codigo_rollo}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                              {r.tela_nombre} · {r.tela_color}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700">
                              {r.metraje.toFixed(2)} m
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRollo(r.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Quitar rollo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Resumen Total Despacho */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Cantidad Rollos:</span>
                    <strong className="text-slate-900 font-mono font-bold">{selectedRolloIds.length}</strong>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1.5 text-sm">
                    <span>Total a Despachar:</span>
                    <strong className="text-emerald-700 font-mono text-base font-bold">
                      {totalMetrosDespacho.toFixed(2)} m
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || selectedRolloIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                Confirmar Salida ({selectedRolloIds.length} rollos · {totalMetrosDespacho.toFixed(2)} m)
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
