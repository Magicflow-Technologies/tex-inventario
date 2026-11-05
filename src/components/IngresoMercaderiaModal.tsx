import React, { useState, useEffect, useRef } from 'react';
import { Tela, MotivoMovimientoIN } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import { generateCodigoRollo } from '../utils/uuid';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  QrCode,
  Search,
  Check,
  Receipt,
  Save,
  AlertCircle,
  Layers,
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
  id: string;
  tela_id: string;
  metraje: string;
  lote: string;
  ubicacion: string;
  codigo_rollo: string;
  detallesAbiertos: boolean;
}

function getColorBadgeClass(colorText?: string): string {
  const c = (colorText || '').toLowerCase();
  if (c.includes('negro')) return 'bg-slate-900';
  if (c.includes('azul noche') || c.includes('marino')) return 'bg-blue-950';
  if (c.includes('azul')) return 'bg-blue-600';
  if (c.includes('charcoal') || c.includes('grafito')) return 'bg-zinc-700';
  if (c.includes('plomo') || c.includes('gris') || c.includes('cenizo')) return 'bg-slate-500';
  if (c.includes('silka') || c.includes('beige') || c.includes('arena') || c.includes('crema')) return 'bg-stone-400';
  if (c.includes('ginda') || c.includes('guinda') || c.includes('vino') || c.includes('rojo') || c.includes('granate')) return 'bg-rose-800';
  if (c.includes('verde')) return 'bg-emerald-700';
  if (c.includes('marron') || c.includes('marrón') || c.includes('cafe') || c.includes('café')) return 'bg-amber-900';
  if (c.includes('blanco') || c.includes('perla')) return 'bg-slate-200 border border-slate-400';
  return 'bg-blue-700';
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
  const defaultTela = initialTelaId || (telas.length > 0 ? telas[0].id : '');

  // Cabecera del movimiento IN
  const [cabeceraAbierta, setCabeceraAbierta] = useState(true);
  const [motivo, setMotivo] = useState<MotivoMovimientoIN>('COMPRA_LOCAL');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [entidadOrigenDestino, setEntidadOrigenDestino] = useState('');
  const [loteDefecto, setLoteDefecto] = useState(`LOT-${currentYear}-A1`);
  const [registradoPor, setRegistradoPor] = useState(
    defaultRegistradoPor || 'Administrador General'
  );
  const [observaciones, setObservaciones] = useState('');

  // Rollos a ingresar
  const [rollos, setRollos] = useState<ItemRolloForm[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-modal selector rápido de Tela y Color
  const [rolloEditandoTelaId, setRolloEditandoTelaId] = useState<string | null>(null);
  const [busquedaTela, setBusquedaTela] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const seq = inventoryStore.getNextRolloSequence();
      const targetTelaId = initialTelaId || (telas.length > 0 ? telas[0].id : '');
      const defaultLot = `LOT-${currentYear}-A1`;
      setMotivo('COMPRA_LOCAL');
      setDocumentoReferencia('');
      setEntidadOrigenDestino('');
      setLoteDefecto(defaultLot);
      setObservaciones('');
      setCabeceraAbierta(true);
      if (defaultRegistradoPor) setRegistradoPor(defaultRegistradoPor);
      setErrorMsg(null);
      setRolloEditandoTelaId(null);
      setBusquedaTela('');
      setRollos([
        {
          id: `r_${Date.now()}_0`,
          tela_id: targetTelaId,
          metraje: '50.00',
          lote: defaultLot,
          ubicacion: 'Estante A - Nivel 1',
          codigo_rollo: generateCodigoRollo(seq),
          detallesAbiertos: false,
        },
      ]);
    }
  }, [isOpen, initialTelaId, defaultRegistradoPor, currentYear, telas]);

  useEffect(() => {
    if (rolloEditandoTelaId) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [rolloEditandoTelaId]);

  if (!isOpen) return null;

  const getNextSequenceForIndex = (offset = 0) => {
    return inventoryStore.getNextRolloSequence() + rollos.length + offset;
  };

  const scrollToBottomRoll = () => {
    setTimeout(() => {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTo({
          top: listContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 80);
  };

  const handleDuplicarRollo = (idBase?: string) => {
    if (rollos.length === 0) {
      handleAgregarRolloVacio();
      return;
    }
    const base = idBase
      ? rollos.find((r) => r.id === idBase) || rollos[rollos.length - 1]
      : rollos[rollos.length - 1];

    const nuevo: ItemRolloForm = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tela_id: base.tela_id || defaultTela,
      metraje: base.metraje || '50.00',
      lote: base.lote || loteDefecto || `LOT-${currentYear}-A1`,
      ubicacion: base.ubicacion || 'Estante A - Nivel 1',
      codigo_rollo: generateCodigoRollo(getNextSequenceForIndex(0)),
      detallesAbiertos: false,
    };

    setRollos((prev) => [...prev, nuevo]);
    scrollToBottomRoll();
  };

  const handleAgregarRolloVacio = () => {
    const nuevo: ItemRolloForm = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tela_id: defaultTela,
      metraje: '50.00',
      lote: loteDefecto || `LOT-${currentYear}-A1`,
      ubicacion: 'Estante A - Nivel 1',
      codigo_rollo: generateCodigoRollo(getNextSequenceForIndex(0)),
      detallesAbiertos: false,
    };
    setRollos((prev) => [...prev, nuevo]);
    scrollToBottomRoll();
  };

  const handleAddMultiple = (cantidad: number) => {
    const lastRollo = rollos[rollos.length - 1];
    const newItems: ItemRolloForm[] = [];
    for (let i = 0; i < cantidad; i++) {
      newItems.push({
        id: `r_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        tela_id: lastRollo ? lastRollo.tela_id : defaultTela,
        metraje: lastRollo ? lastRollo.metraje : '50.00',
        lote: lastRollo ? lastRollo.lote : loteDefecto || `LOT-${currentYear}-A1`,
        ubicacion: lastRollo ? lastRollo.ubicacion : 'Estante A - Nivel 1',
        codigo_rollo: generateCodigoRollo(getNextSequenceForIndex(i)),
        detallesAbiertos: false,
      });
    }
    setRollos((prev) => [...prev, ...newItems]);
    scrollToBottomRoll();
  };

  const handleRemoveRollo = (id: string) => {
    if (rollos.length <= 1) {
      setRollos([
        {
          id: `r_${Date.now()}_reset`,
          tela_id: defaultTela,
          metraje: '50.00',
          lote: loteDefecto || `LOT-${currentYear}-A1`,
          ubicacion: 'Estante A - Nivel 1',
          codigo_rollo: generateCodigoRollo(inventoryStore.getNextRolloSequence()),
          detallesAbiertos: false,
        },
      ]);
      return;
    }
    setRollos((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRollo = (id: string, field: keyof ItemRolloForm, val: string | boolean) => {
    setRollos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleAjustarMetros = (id: string, delta: number) => {
    setRollos((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const current = parseFloat(r.metraje) || 0;
        const next = Math.max(0.1, Number((current + delta).toFixed(2)));
        return { ...r, metraje: next.toFixed(2) };
      })
    );
  };

  const handleLoteDefectoChange = (nuevoLote: string) => {
    const upper = nuevoLote.toUpperCase();
    const prevDefault = loteDefecto;
    setLoteDefecto(upper);
    // Sincronizar rollos que aún tenían el lote por defecto anterior
    setRollos((prev) =>
      prev.map((r) => (r.lote === prevDefault ? { ...r, lote: upper } : r))
    );
  };

  // Cálculo en vivo
  const totalMetros = rollos.reduce((acc, r) => acc + (parseFloat(r.metraje) || 0), 0);

  // Filtrado de catálogo para el selector rápido de tela
  const telasFiltradas = telas.filter((t) => {
    const q = busquedaTela.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.codigo || '').toLowerCase().includes(q) ||
      (t.nombre || '').toLowerCase().includes(q) ||
      (t.codigo_color || '').toLowerCase().includes(q) ||
      (t.color || '').toLowerCase().includes(q) ||
      (t.linea || '').toLowerCase().includes(q)
    );
  });

  const handleSeleccionarTela = (telaId: string) => {
    if (rolloEditandoTelaId) {
      handleUpdateRollo(rolloEditandoTelaId, 'tela_id', telaId);
    }
    setRolloEditandoTelaId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!documentoReferencia.trim()) {
      setCabeceraAbierta(true);
      setErrorMsg('Debe registrar el número de Documento de Referencia (Guía Remisión / Factura / DUA).');
      return;
    }

    if (!entidadOrigenDestino.trim()) {
      setCabeceraAbierta(true);
      setErrorMsg('Debe especificar el Proveedor u Origen de la mercadería.');
      return;
    }

    for (let i = 0; i < rollos.length; i++) {
      const r = rollos[i];
      const m = parseFloat(r.metraje);
      if (isNaN(m) || m <= 0) {
        setErrorMsg(`El rollo #${i + 1} tiene un metraje inválido (debe ser mayor a 0 metros).`);
        return;
      }
      if (!r.lote || !r.lote.trim()) {
        handleUpdateRollo(r.id, 'detallesAbiertos', true);
        setErrorMsg(`Ingrese el Lote / DUA para el rollo #${i + 1}.`);
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
        documento_referencia: documentoReferencia.trim(),
        entidad_origen_destino: entidadOrigenDestino.trim(),
        observaciones: observaciones.trim(),
        registrado_por: registradoPor.trim() || 'Administrador General',
        rollos: rollos.map((r) => ({
          tela_id: r.tela_id,
          metraje: parseFloat(r.metraje),
          lote: r.lote.trim(),
          ubicacion: r.ubicacion.trim() || 'Estante A - Nivel 1',
          codigo_rollo: r.codigo_rollo.trim(),
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 lg:p-6 overflow-hidden select-none">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-100 sm:rounded-3xl w-full max-w-2xl lg:max-w-6xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 relative animate-in fade-in duration-200"
      >
        {/* ================= TOP APP BAR (#0F284E) ================= */}
        <header className="bg-[#0F284E] text-white shadow-md border-b border-blue-900/40 shrink-0 z-20">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-black text-base text-blue-200 shrink-0">
                8t
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                    Flujo A · IN
                  </span>
                  <span className="text-[11px] text-slate-300 truncate">Almacén Central</span>
                </div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate">
                  Ingreso de Mercadería
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCabeceraAbierta(!cabeceraAbierta)}
                className="px-2.5 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 text-xs font-semibold border border-white/10 active:scale-95 transition cursor-pointer"
                title="Mostrar u ocultar datos de Guía / Factura / Proveedor"
              >
                <Receipt className="w-4 h-4 text-blue-300" />
                <span>Guía/Doc</span>
                {documentoReferencia.trim() && entidadOrigenDestino.trim() && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    cabeceraAbierta ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/50 hover:bg-rose-600/80 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ================= 1. CABECERA DESPLEGABLE (SUNAT & ALMACÉN) ================= */}
          {cabeceraAbierta && (
            <div className="bg-[#0A1E3C] px-4 lg:px-6 py-3.5 lg:py-4 border-t border-blue-900/60 text-xs transition-all">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 lg:gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Motivo de Ingreso *
                  </label>
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value as MotivoMovimientoIN)}
                    className="w-full bg-slate-900/90 text-white rounded-xl p-2.5 border border-slate-700 focus:border-blue-400 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="COMPRA_LOCAL">COMPRA_LOCAL (Nacional)</option>
                    <option value="IMPORTACION">IMPORTACIÓN (DUA / Exterior)</option>
                    <option value="AJUSTE_INICIAL">AJUSTE_INICIAL (Inventario Físico)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Doc. Referencia (Guía / Factura) *
                  </label>
                  <input
                    type="text"
                    value={documentoReferencia}
                    onChange={(e) => setDocumentoReferencia(e.target.value)}
                    placeholder="Ej. GR-001-0941 / F001-492"
                    className="w-full bg-slate-900/90 text-white placeholder-slate-500 rounded-xl p-2.5 border border-slate-700 focus:border-blue-400 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Proveedor / Origen *
                  </label>
                  <input
                    type="text"
                    value={entidadOrigenDestino}
                    onChange={(e) => setEntidadOrigenDestino(e.target.value)}
                    placeholder="Ej. Hilanderías del Sur S.A.C."
                    className="w-full bg-slate-900/90 text-white placeholder-slate-500 rounded-xl p-2.5 border border-slate-700 focus:border-blue-400 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Lote / DUA Predeterminado
                  </label>
                  <input
                    type="text"
                    value={loteDefecto}
                    onChange={(e) => handleLoteDefectoChange(e.target.value)}
                    placeholder="LOT-2026-A1"
                    className="w-full bg-slate-900/90 text-white placeholder-slate-500 rounded-xl p-2.5 border border-slate-700 focus:border-blue-400 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Registrado Por (Responsable)
                  </label>
                  <input
                    type="text"
                    value={registradoPor}
                    onChange={(e) => setRegistradoPor(e.target.value)}
                    className="w-full bg-slate-900/70 text-slate-200 rounded-xl p-2.5 border border-slate-800 focus:border-blue-400 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Observaciones Generales
                  </label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional: Rollos sellados en polietileno..."
                    className="w-full bg-slate-900/70 text-slate-200 placeholder-slate-500 rounded-xl p-2.5 border border-slate-800 focus:border-blue-400 focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </header>

        {/* ================= BARRA DE ACCIONES RÁPIDAS ================= */}
        <section className="px-4 py-2.5 bg-white border-b border-slate-200 shadow-xs shrink-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Rollos a Descargar ({rollos.length})
              </span>
              <p className="text-[11px] text-slate-500">
                Toca &ldquo;Duplicar&rdquo; para clonar tela, metraje y lote
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddMultiple(3)}
                className="px-2.5 py-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold active:scale-95 transition cursor-pointer"
                title="Agregar 3 rollos seguidos"
              >
                +3 Rollos
              </button>

              <button
                type="button"
                onClick={() => handleDuplicarRollo()}
                className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar</span>
              </button>

              <button
                type="button"
                onClick={handleAgregarRolloVacio}
                className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 hover:bg-blue-700 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Rollo</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================= MENSAJE DE ERROR ================= */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* ================= CONTENEDOR DE ROLLOS (TARJETAS EN CELULAR / FILAS AMPLIAS EN PC) ================= */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-3.5 lg:p-5 space-y-3"
        >
          {/* Cabecera de Columnas visible solo en Computadora (lg:) */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 px-4 py-2 bg-slate-200/70 rounded-xl text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
            <div className="col-span-2">Código Rollo (QR)</div>
            <div className="col-span-4">Tela / Variante de Color</div>
            <div className="col-span-2 text-center">Metros Exactos *</div>
            <div className="col-span-2">Lote / DUA *</div>
            <div className="col-span-2 flex items-center justify-between">
              <span>Ubicación Almacén</span>
              <span>Acciones</span>
            </div>
          </div>

          {rollos.map((r, index) => {
            const tela = telas.find((t) => t.id === r.tela_id) || telas[0];
            const dotClass = getColorBadgeClass(tela?.color);

            return (
              <article
                key={r.id}
                className="bg-white rounded-2xl p-3.5 lg:px-4 lg:py-3 border border-slate-200/90 shadow-xs relative transition hover:border-blue-300"
              >
                {/* ================= VISTA CELULAR / TABLET (< lg) ================= */}
                <div className="lg:hidden space-y-2.5">
                  {/* Fila Superior: # Rollo, Selector Rápido de Tela y Acciones */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200">
                        {index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setBusquedaTela('');
                          setRolloEditandoTelaId(r.id);
                        }}
                        className="text-left py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 transition flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${dotClass} shrink-0 shadow-2xs`}
                        />
                        {tela ? (
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {tela.codigo} · {tela.nombre}
                            </div>
                            <div className="text-[11px] text-blue-700 font-semibold truncate">
                              Cód. {tela.codigo_color || 'S/N'} - {tela.color || 'Estándar'}{' '}
                              <span className="text-slate-400 font-normal">
                                ({tela.linea || 'General'} · {tela.ancho || 1.5}m)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-rose-600">
                            Seleccionar Tela del Catálogo...
                          </div>
                        )}
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-auto" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicarRollo(r.id)}
                        title="Duplicar este rollo"
                        className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center active:scale-90 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRollo(r.id)}
                        title={rollos.length === 1 ? 'Reiniciar fila' : 'Eliminar rollo'}
                        className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center active:scale-90 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fila Central: Input de Metros Grande & Accesible */}
                  <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between border border-slate-100">
                    <span className="text-xs font-bold text-slate-600">
                      Metros exactos:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAjustarMetros(r.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold active:scale-90 flex items-center justify-center shadow-2xs cursor-pointer"
                        title="Restar 1 metro"
                      >
                        -
                      </button>

                      <div className="relative w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={r.metraje}
                          onChange={(e) => handleUpdateRollo(r.id, 'metraje', e.target.value)}
                          className="w-full text-center text-base font-black text-slate-900 bg-white border border-blue-400 rounded-lg py-1 px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                          placeholder="50.00"
                          required
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAjustarMetros(r.id, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold active:scale-90 flex items-center justify-center shadow-2xs cursor-pointer"
                        title="Sumar 1 metro"
                      >
                        +
                      </button>
                      <span className="text-xs font-bold text-slate-500">m</span>
                    </div>
                  </div>

                  {/* Fila Inferior: Datos Secundarios (Código QR, Lote y Ubicación) */}
                  <div className="pt-0.5 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      <span>{r.codigo_rollo}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateRollo(r.id, 'detallesAbiertos', !r.detallesAbiertos)
                      }
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded-lg hover:bg-blue-50 transition"
                    >
                      <span>
                        {r.lote || 'Sin Lote'} · {r.ubicacion.split('-')[0].trim()}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          r.detallesAbiertos ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Acordeón colapsable para Código QR, Lote y Ubicación específica */}
                  {r.detallesAbiertos && (
                    <div className="pt-2.5 border-t border-dashed border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Código de Rollo (QR):
                        </label>
                        <input
                          type="text"
                          value={r.codigo_rollo}
                          onChange={(e) =>
                            handleUpdateRollo(r.id, 'codigo_rollo', e.target.value)
                          }
                          className="w-full bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs font-mono font-bold text-blue-700 focus:bg-white focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Lote / DUA *:
                        </label>
                        <input
                          type="text"
                          value={r.lote}
                          onChange={(e) =>
                            handleUpdateRollo(r.id, 'lote', e.target.value.toUpperCase())
                          }
                          className="w-full bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs font-mono text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Ubicación Almacén:
                        </label>
                        <input
                          type="text"
                          value={r.ubicacion}
                          onChange={(e) =>
                            handleUpdateRollo(r.id, 'ubicacion', e.target.value)
                          }
                          className="w-full bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ================= VISTA AMPLIA DE COMPUTADORA (hidden lg:grid) ================= */}
                <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 lg:items-center">
                  {/* Col 1-2: # + Código Rollo QR */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-200">
                      {index + 1}
                    </span>
                    <div className="relative flex-1 min-w-0">
                      <QrCode className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={r.codigo_rollo}
                        onChange={(e) =>
                          handleUpdateRollo(r.id, 'codigo_rollo', e.target.value)
                        }
                        className="w-full bg-slate-50 hover:bg-white rounded-xl pl-8 pr-2 py-2 border border-slate-200 text-xs font-mono font-bold text-blue-700 focus:bg-white focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Col 3-6: Selector de Tela y Color */}
                  <div className="col-span-4">
                    <button
                      type="button"
                      onClick={() => {
                        setBusquedaTela('');
                        setRolloEditandoTelaId(r.id);
                      }}
                      className="w-full text-left py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 transition flex items-center gap-2.5 min-w-0 cursor-pointer group"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${dotClass} shrink-0 shadow-2xs`}
                      />
                      {tela ? (
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {tela.codigo} · {tela.nombre}
                          </div>
                          <div className="text-[11px] text-blue-700 font-semibold truncate">
                            Cód. {tela.codigo_color || 'S/N'} - {tela.color || 'Estándar'}{' '}
                            <span className="text-slate-400 font-normal">
                              ({tela.linea || 'General'} · {tela.ancho || 1.5}m)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-rose-600">
                          Seleccionar Tela del Catálogo...
                        </div>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-auto" />
                    </button>
                  </div>

                  {/* Col 7-8: Metros Exactos con botones - / + */}
                  <div className="col-span-2 flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAjustarMetros(r.id, -1)}
                      className="w-8 h-9 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer shrink-0"
                      title="Restar 1 metro"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={r.metraje}
                      onChange={(e) => handleUpdateRollo(r.id, 'metraje', e.target.value)}
                      className="w-24 text-center text-sm font-black text-slate-900 bg-white border border-blue-400 rounded-xl py-1.5 px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      placeholder="50.00"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleAjustarMetros(r.id, 1)}
                      className="w-8 h-9 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer shrink-0"
                      title="Sumar 1 metro"
                    >
                      +
                    </button>
                  </div>

                  {/* Col 9-10: Lote / DUA visible directamente */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={r.lote}
                      onChange={(e) =>
                        handleUpdateRollo(r.id, 'lote', e.target.value.toUpperCase())
                      }
                      placeholder="LOT-2026-A1"
                      className="w-full bg-slate-50 hover:bg-white rounded-xl p-2 border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Col 11-12: Ubicación Almacén + Botones Duplicar / Eliminar */}
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={r.ubicacion}
                      onChange={(e) =>
                        handleUpdateRollo(r.id, 'ubicacion', e.target.value)
                      }
                      placeholder="Estante A - Nivel 1"
                      className="w-full bg-slate-50 hover:bg-white rounded-xl p-2 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicarRollo(r.id)}
                        title="Duplicar este rollo"
                        className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRollo(r.id)}
                        title={rollos.length === 1 ? 'Reiniciar fila' : 'Eliminar rollo'}
                        className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ================= BOTTOM FLOATING DOCK (RESUMEN & CONFIRMACIÓN) ================= */}
        <footer className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] shrink-0 z-20">
          <div className="flex items-center justify-between gap-3">
            {/* Resumen de Totales */}
            <div className="leading-tight">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Total:</span>
                <span className="text-slate-800 font-bold">
                  {rollos.length} {rollos.length === 1 ? 'rollo' : 'rollos'}
                </span>
              </div>
              <div className="text-lg font-black text-[#0F284E] flex items-baseline gap-1 font-mono">
                <span>{totalMetros.toFixed(2)}</span>
                <span className="text-xs font-bold text-blue-600 font-sans">m</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-2xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 max-w-xs py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 text-xs active:scale-[0.98] transition cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>Confirmar Ingreso ({rollos.length})</span>
              </button>
            </div>
          </div>
        </footer>

        {/* ================= MODAL SELECCIONADOR RÁPIDO DE TELA (BOTTOM SHEET / OVERLAY) ================= */}
        {rolloEditandoTelaId && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-150"
            onClick={() => setRolloEditandoTelaId(null)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[82vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Encabezado y buscador */}
              <div className="p-4 pb-3 border-b border-slate-100">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      Seleccionar Tela y Color
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Elige la variedad del catálogo para asignarla al rollo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRolloEditandoTelaId(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-90 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={busquedaTela}
                    onChange={(e) => setBusquedaTela(e.target.value)}
                    placeholder="Buscar código, nombre o color (ej: 2001, Silka, C-900...)"
                    className="w-full bg-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none border border-transparent focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Lista scrolleable de telas */}
              <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
                {telasFiltradas.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    No se encontraron telas con ese código, nombre o color.
                  </div>
                ) : (
                  telasFiltradas.map((t) => {
                    const currentRollo = rollos.find((r) => r.id === rolloEditandoTelaId);
                    const isSelected = currentRollo?.tela_id === t.id;
                    const badgeClass = getColorBadgeClass(t.color);

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSeleccionarTela(t.id)}
                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-300 shadow-2xs'
                            : 'hover:bg-slate-50 border-slate-100 active:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-3.5 h-3.5 rounded-full ${badgeClass} shrink-0`}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {t.codigo} · {t.nombre}
                            </div>
                            <div className="text-xs font-semibold text-blue-700 truncate">
                              Cód. Color {t.codigo_color || 'S/N'} - {t.color || 'Estándar'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {t.linea || 'General'} · Ancho: {t.ancho || 1.5}m
                            </div>
                          </div>
                        </div>

                        <Check
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-blue-600' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
