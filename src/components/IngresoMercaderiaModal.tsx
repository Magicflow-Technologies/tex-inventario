import React, { useState, useEffect } from 'react';
import { Tela, MotivoMovimientoIN } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import { generateCodigoRollo } from '../utils/uuid';
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  PackagePlus,
  Layers,
  FileCheck,
  AlertCircle,
} from 'lucide-react';

interface IngresoMercaderiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  telas: Tela[];
  initialTelaId?: string;
  defaultRegistradoPor?: string;
  onSuccess: (movimientoId: string, countRollos: number) => void;
}

interface ItemRolloForm {
  tela_id: string;
  metraje: string;
  lote: string;
  ubicacion: string;
  codigo_rollo: string;
}

export const IngresoMercaderiaModal: React.FC<IngresoMercaderiaModalProps> = ({
  isOpen,
  onClose,
  telas,
  initialTelaId,
  defaultRegistradoPor,
  onSuccess,
}) => {
  const currentYear = new Date().getFullYear();
  const baseSeq = inventoryStore.getNextRolloSequence();

  const defaultTela = initialTelaId || (telas.length > 0 ? telas[0].id : '');

  // Cabecera del movimiento IN
  const [motivo, setMotivo] = useState<MotivoMovimientoIN>('COMPRA_LOCAL');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [entidadOrigenDestino, setEntidadOrigenDestino] = useState('');
  const [registradoPor, setRegistradoPor] = useState(
    defaultRegistradoPor || 'Carlos Mendoza (Jefe Almacén)'
  );
  const [observaciones, setObservaciones] = useState('');

  // Rollos a ingresar
  const [rollos, setRollos] = useState<ItemRolloForm[]>([
    {
      tela_id: defaultTela,
      metraje: '50.00',
      lote: `LOT-${currentYear}-A1`,
      ubicacion: 'Estante A - Nivel 1',
      codigo_rollo: generateCodigoRollo(baseSeq),
    },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const seq = inventoryStore.getNextRolloSequence();
      const targetTelaId = initialTelaId || (telas.length > 0 ? telas[0].id : '');
      const selTela = telas.find((t) => t.id === targetTelaId);
      setMotivo('COMPRA_LOCAL');
      setDocumentoReferencia('');
      setEntidadOrigenDestino('');
      setObservaciones('');
      if (defaultRegistradoPor) setRegistradoPor(defaultRegistradoPor);
      setErrorMsg(null);
      setRollos([
        {
          tela_id: targetTelaId,
          metraje: selTela?.metraje_estandar ? String(selTela.metraje_estandar.toFixed(2)) : '50.00',
          lote: selTela?.lote || `LOT-${currentYear}-A1`,
          ubicacion: 'Estante A - Nivel 1',
          codigo_rollo: generateCodigoRollo(seq),
        },
      ]);
    }
  }, [isOpen, initialTelaId, defaultRegistradoPor]);

  if (!isOpen) return null;

  const handleAddRollo = () => {
    const nextSeq = inventoryStore.getNextRolloSequence() + rollos.length;
    const lastRollo = rollos[rollos.length - 1];
    setRollos([
      ...rollos,
      {
        tela_id: lastRollo ? lastRollo.tela_id : defaultTela,
        metraje: lastRollo ? lastRollo.metraje : '50.00',
        lote: lastRollo ? lastRollo.lote : `LOT-${currentYear}-A1`,
        ubicacion: lastRollo ? lastRollo.ubicacion : 'Estante A - Nivel 1',
        codigo_rollo: generateCodigoRollo(nextSeq),
      },
    ]);
  };

  const handleAddMultiple = (cantidad: number) => {
    const lastRollo = rollos[rollos.length - 1];
    const newItems: ItemRolloForm[] = [];
    const startSeq = inventoryStore.getNextRolloSequence() + rollos.length;
    for (let i = 0; i < cantidad; i++) {
      newItems.push({
        tela_id: lastRollo ? lastRollo.tela_id : defaultTela,
        metraje: lastRollo ? lastRollo.metraje : '50.00',
        lote: lastRollo ? lastRollo.lote : `LOT-${currentYear}-A1`,
        ubicacion: lastRollo ? lastRollo.ubicacion : 'Estante A - Nivel 1',
        codigo_rollo: generateCodigoRollo(startSeq + i),
      });
    }
    setRollos([...rollos, ...newItems]);
  };

  const handleRemoveRollo = (index: number) => {
    if (rollos.length === 1) {
      setRollos([
        {
          tela_id: defaultTela,
          metraje: '50.00',
          lote: `LOT-${currentYear}-A1`,
          ubicacion: 'Estante A - Nivel 1',
          codigo_rollo: generateCodigoRollo(inventoryStore.getNextRolloSequence()),
        },
      ]);
      return;
    }
    setRollos(rollos.filter((_, idx) => idx !== index));
  };

  const handleUpdateRollo = (index: number, field: keyof ItemRolloForm, val: string) => {
    const updated = [...rollos];
    updated[index] = { ...updated[index], [field]: val };
    setRollos(updated);
  };

  // Cálculo en vivo
  const totalMetros = rollos.reduce((acc, r) => acc + (parseFloat(r.metraje) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!entidadOrigenDestino.trim()) {
      setErrorMsg('Debe especificar el Proveedor u Origen de la mercadería.');
      return;
    }

    if (!documentoReferencia.trim()) {
      setErrorMsg('Debe registrar el número de Documento de Referencia (Guía Remisión / Factura / DUA).');
      return;
    }

    // Validar rollos
    for (let i = 0; i < rollos.length; i++) {
      const r = rollos[i];
      const m = parseFloat(r.metraje);
      if (isNaN(m) || m <= 0) {
        setErrorMsg(`El rollo #${i + 1} tiene un metraje inválido.`);
        return;
      }
      if (!r.tela_id) {
        setErrorMsg(`Seleccione la tela para el rollo #${i + 1}.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = inventoryStore.registrarIngreso({
        motivo,
        documento_referencia: documentoReferencia,
        entidad_origen_destino: entidadOrigenDestino,
        observaciones,
        registrado_por: registradoPor,
        rollos: rollos.map((r) => ({
          tela_id: r.tela_id,
          metraje: parseFloat(r.metraje),
          lote: r.lote,
          ubicacion: r.ubicacion,
          codigo_rollo: r.codigo_rollo,
        })),
      });

      onSuccess(res.movimientoId, res.rollosCreados.length);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar ingreso';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Flujo A: Registro de Ingreso de Mercadería (IN)
              </h2>
              <p className="text-xs text-slate-500">
                Alta física de rollos individuales con código de barras y doble contabilidad rollo a rollo.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sección 1: Datos del Movimiento (Cabecera movimientos_inventario) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#1a73e8]" />
              <span>1. Cabecera del Movimiento (SUNAT & Almacén)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo de Ingreso *
                </label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoMovimientoIN)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="COMPRA_LOCAL">COMPRA_LOCAL (Nacional)</option>
                  <option value="IMPORTACION">IMPORTACION (DUA / Extranjero)</option>
                  <option value="AJUSTE_INICIAL">AJUSTE_INICIAL (Inventario Físico)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Documento Referencia *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Guía GR-001-0941 / Factura F001-492"
                  value={documentoReferencia}
                  onChange={(e) => setDocumentoReferencia(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proveedor / Origen *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Hilanderías del Sur S.A.C."
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
                  Registrado Por (Responsable)
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
                  Observaciones Generales
                </label>
                <input
                  type="text"
                  placeholder="Ej. Rollos sellados en polietileno, buen estado"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Detalle de Rollos Físicos (TABLA rollos & movimiento_detalles) */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1a73e8]" />
                  <span>2. Unidades Físicas (Rollos a ingresar)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Cada fila representa un rollo físico independiente con su metraje exacto, lote y ubicación.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddMultiple(3)}
                  className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all whitespace-nowrap cursor-pointer font-medium"
                >
                  + 3 Rollos
                </button>
                <button
                  type="button"
                  onClick={handleAddRollo}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-[#1a73e8] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Rollo</span>
                </button>
              </div>
            </div>

            {/* Listado dinámico de rollos */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Código de Rollo</th>
                    <th className="py-2.5 px-3">Tela / Color</th>
                    <th className="py-2.5 px-3 w-32 text-right">Metros *</th>
                    <th className="py-2.5 px-3">Lote / DUA</th>
                    <th className="py-2.5 px-3">Ubicación Almacén</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rollos.map((rollo, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono font-medium">
                        {index + 1}
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rollo.codigo_rollo}
                          onChange={(e) => handleUpdateRollo(index, 'codigo_rollo', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#1a73e8] focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                          placeholder="ROL-2026-XXXXX"
                          required
                        />
                      </td>

                      <td className="py-2 px-3">
                        <select
                          value={rollo.tela_id}
                          onChange={(e) => {
                            const newTelaId = e.target.value;
                            const selTela = telas.find((t) => t.id === newTelaId);
                            const updated = [...rollos];
                            updated[index] = {
                              ...updated[index],
                              tela_id: newTelaId,
                              lote: selTela?.lote || updated[index].lote,
                              metraje: selTela?.metraje_estandar ? String(selTela.metraje_estandar) : updated[index].metraje,
                            };
                            setRollos(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                        >
                          {telas.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.codigo} · {t.nombre} - Cód. Color {t.codigo_color || 'S/N'} ({t.linea || 'General'} - Ancho: {t.ancho || 1.5}m)
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={rollo.metraje}
                            onChange={(e) => handleUpdateRollo(index, 'metraje', e.target.value)}
                            className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 text-right focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                            placeholder="0.00"
                            required
                          />
                          <span className="text-slate-500 text-xs">m</span>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rollo.lote}
                          onChange={(e) => handleUpdateRollo(index, 'lote', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                          placeholder="Lote o DUA"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rollo.ubicacion}
                          onChange={(e) => handleUpdateRollo(index, 'ubicacion', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                          placeholder="Ej. Estante B - Nivel 2"
                        />
                      </td>

                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRollo(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={rollos.length === 1 ? 'Limpiar fila' : 'Eliminar fila de rollo'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen del Lote */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-700 gap-4">
              <div className="flex items-center gap-4">
                <span>
                  Total Rollos: <strong className="text-slate-900 font-mono font-bold">{rollos.length}</strong>
                </span>
                <span>
                  Metraje Total a Ingresar:{' '}
                  <strong className="text-[#1a73e8] font-mono text-sm font-bold">
                    {totalMetros.toFixed(2)} m
                  </strong>
                </span>
              </div>
              <div className="text-slate-500 italic">
                * Todos los rollos se registrarán con estado DISPONIBLE y UUIDv4 único.
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar Ingreso ({rollos.length} rollos)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
