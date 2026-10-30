import React from 'react';
import { RolloConTela } from '../types/inventory';
import { X, Printer } from 'lucide-react';

interface EtiquetaRolloModalProps {
  rollo: RolloConTela | null;
  onClose: () => void;
}

export const EtiquetaRolloModal: React.FC<EtiquetaRolloModalProps> = ({ rollo, onClose }) => {
  if (!rollo) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generador visual de código de barras simulado (patrón estético de barras verticales)
  const barcodeChars = (rollo.codigo_rollo + rollo.id).split('');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">Etiqueta de Almacén - Rollo Físico</span>
              <p className="text-xs text-slate-500">Rótulo para identificación física rollo a rollo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Etiqueta Térmica Imprimible (Diseño industrial para rotulado de rollos de tela) */}
        <div className="p-6 flex flex-col items-center">
          <div
            id="etiqueta-imprimible"
            className="w-full bg-white text-slate-900 rounded-2xl p-6 border-2 border-dashed border-slate-300 shadow-sm space-y-4 font-sans print:border-none print:shadow-none print:m-0"
          >
            {/* Header de Etiqueta */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div>
                <div className="text-[10px] tracking-wider uppercase font-bold text-[#1a73e8]">
                  Textiles Ocho Lukal E.I.R.L.
                </div>
                <div className="text-lg font-black tracking-tight text-slate-900">
                  8TEX ALMACÉN CENTRAL
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-mono">Control Físico</div>
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {new Date(rollo.fecha_ingreso).toLocaleDateString('es-PE')}
                </div>
              </div>
            </div>

            {/* Código de Barras Físico */}
            <div className="py-3 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
              <div className="h-12 flex items-stretch gap-1 px-4 overflow-hidden">
                {barcodeChars.map((char, i) => {
                  const code = char.charCodeAt(0);
                  const isWide = code % 2 === 0;
                  const isSpace = code % 5 === 0;
                  return (
                    <div
                      key={i}
                      className={`h-full ${isSpace ? 'w-1 bg-transparent' : isWide ? 'w-1.5 bg-black' : 'w-0.5 bg-black'}`}
                    />
                  );
                })}
              </div>
              <div className="font-mono text-base font-black tracking-widest text-slate-900 mt-1.5">
                {rollo.codigo_rollo}
              </div>
            </div>

            {/* Datos de la Tela y Metraje */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-bold uppercase text-slate-500">Cód. Artículo:</span>
                <span className="font-mono font-bold text-[#1a73e8] text-sm">
                  {rollo.tela_codigo}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-bold uppercase text-slate-500">Artículo / Tela:</span>
                <span className="font-bold text-slate-900 text-xs text-right truncate max-w-[240px]">
                  {rollo.tela_nombre}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-bold uppercase text-slate-500">Cód. Color / Tono:</span>
                <span className="font-semibold text-slate-800 text-right">
                  Cód. {rollo.tela_codigo_color || '00'} · {rollo.tela_color}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500">Línea:</span>{' '}
                  <strong className="text-slate-900">{rollo.tela_linea || 'General'}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Ancho:</span>{' '}
                  <strong className="font-mono text-slate-900">{(rollo.tela_ancho || 1.5).toFixed(2)} m</strong>
                </div>
              </div>

              <div className="flex justify-between items-baseline bg-blue-50/80 border border-blue-200/80 p-3 rounded-xl mt-2">
                <span className="text-xs font-black uppercase text-slate-700">Metraje Exacto:</span>
                <span className="font-mono text-xl font-black text-slate-900">
                  {rollo.metraje.toFixed(2)} METROS
                </span>
              </div>
            </div>

            {/* Ubicación y Lote */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-500 block">Lote / DUA:</span>
                <strong className="font-mono text-slate-900">{rollo.lote || 'N/A'}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Ubicación Física:</span>
                <strong className="text-slate-900">{rollo.ubicacion || 'Central'}</strong>
              </div>
            </div>

            <div className="text-[9px] text-slate-400 text-center pt-1 border-t border-slate-100 font-mono">
              UUIDv4: {rollo.id}
            </div>
          </div>

          <div className="w-full flex items-center justify-between mt-6 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cerrar
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Etiqueta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
