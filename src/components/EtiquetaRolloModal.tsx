import React, { useMemo } from 'react';
import { RolloConTela } from '../types/inventory';
import { generateQrMatrix } from '../utils/qrCode';
import { X, Printer } from 'lucide-react';

interface EtiquetaRolloModalProps {
  rollo: RolloConTela | null;
  onClose: () => void;
}

export const EtiquetaRolloModal: React.FC<EtiquetaRolloModalProps> = ({ rollo, onClose }) => {
  const qrMatrix = useMemo(() => {
    if (!rollo) return [];
    return generateQrMatrix(rollo.codigo_rollo);
  }, [rollo]);

  if (!rollo) return null;

  const qrSize = qrMatrix.length;

  const handlePrint = () => {
    const labelEl = document.getElementById('etiqueta-imprimible');
    if (!labelEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=640,height=480');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Etiqueta ${rollo.codigo_rollo} - 8TEX</title>
    <style>
      @page {
        size: 100mm 65mm;
        margin: 4mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 12px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
        background: #ffffff;
        color: #0f172a;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .label-box {
        width: 100%;
        max-width: 460px;
        border: 2px dashed #0f172a;
        padding: 16px 20px;
        background: #ffffff;
      }
      .label-header {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.04em;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 1.5px solid #0f172a;
      }
      .label-row {
        font-size: 13px;
        line-height: 1.55;
        margin-bottom: 4px;
      }
      .label-row strong {
        font-weight: 800;
      }
      .label-grid {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
        line-height: 1.55;
        margin-bottom: 4px;
      }
      .qr-section {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px dashed #cbd5e1;
      }
      .qr-box {
        border: 1.5px dashed #0f172a;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
      }
      .code-text {
        font-size: 18px;
        font-weight: 900;
        letter-spacing: 0.04em;
      }
      .color-sub {
        font-size: 11px;
        color: #334155;
        margin-top: 3px;
      }
    </style>
  </head>
  <body>
    <div class="label-box">
      <div class="label-header">8TEX - TEXTILES OCHO LUKAL</div>
      <div class="label-row">
        <strong>TELA:</strong> ${rollo.tela_nombre} (Cód: ${rollo.tela_codigo})
      </div>
      <div class="label-grid">
        <div><strong>METRAJE:</strong> ${rollo.metraje.toFixed(2)} m</div>
        <div><strong>LOTE:</strong> ${rollo.lote || 'S/L'}</div>
      </div>
      <div class="label-row">
        <strong>UBICACIÓN:</strong> ${rollo.ubicacion || 'Almacén Central'}
      </div>
      <div class="qr-section">
        <div class="qr-box">
          ${document.getElementById('qr-svg-container')?.innerHTML || ''}
        </div>
        <div>
          <div class="code-text">${rollo.codigo_rollo}</div>
          <div class="color-sub">Color: ${rollo.tela_codigo_color || ''} ${rollo.tela_color || ''} · Ancho: ${(rollo.tela_ancho || 1.5).toFixed(2)} m</div>
        </div>
      </div>
    </div>
    <script>
      window.onload = function() {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">
                Etiqueta Térmica de Rollo (QR)
              </span>
              <p className="text-xs text-slate-500">
                Formato oficial 8TEX - Textiles Ocho Lukal con código QR escaneable
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

        {/* Etiqueta Imprimible (Diseño exacto solicitado) */}
        <div className="p-6 flex flex-col items-center">
          <div
            id="etiqueta-imprimible"
            className="w-full bg-white text-slate-900 p-6 border-2 border-dashed border-slate-800 shadow-sm space-y-3 font-mono"
          >
            {/* Cabecera: 8TEX - TEXTILES OCHO LUKAL */}
            <div className="text-base sm:text-lg font-black tracking-wider text-slate-900 border-b border-slate-300 pb-2.5">
              8TEX - TEXTILES OCHO LUKAL
            </div>

            {/* Cuerpo de datos */}
            <div className="space-y-1.5 text-xs sm:text-sm pt-1">
              <div className="text-slate-900">
                <span className="font-bold">TELA:</span> {rollo.tela_nombre} (Cód:{' '}
                <span className="font-bold">{rollo.tela_codigo}</span>)
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-900">
                <div>
                  <span className="font-bold">METRAJE:</span>{' '}
                  <span className="font-black">{rollo.metraje.toFixed(2)} m</span>
                </div>
                <div>
                  <span className="font-bold">LOTE:</span>{' '}
                  <span className="font-semibold">{rollo.lote || 'S/L'}</span>
                </div>
              </div>

              <div className="text-slate-900">
                <span className="font-bold">UBICACIÓN:</span>{' '}
                <span>{rollo.ubicacion || 'Almacén Central'}</span>
              </div>
            </div>

            {/* Zona inferior: QR a la izquierda + Código legible a la derecha */}
            <div className="pt-3 mt-2 border-t border-dashed border-slate-300 flex items-center gap-5">
              <div
                id="qr-svg-container"
                className="p-2 border-2 border-dashed border-slate-700 bg-white shrink-0 flex items-center justify-center"
              >
                <svg
                  width="96"
                  height="96"
                  viewBox={`0 0 ${qrSize + 4} ${qrSize + 4}`}
                  xmlns="http://www.w3.org/2000/svg"
                  shapeRendering="crispEdges"
                >
                  <rect width={qrSize + 4} height={qrSize + 4} fill="#ffffff" />
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx + 2}
                          y={rIdx + 2}
                          width={1}
                          height={1}
                          fill="#000000"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>

              <div className="space-y-1">
                <div className="text-lg sm:text-xl font-black tracking-wider text-slate-900">
                  {rollo.codigo_rollo}
                </div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Color: <strong className="text-slate-700">{rollo.tela_codigo_color}</strong> ·{' '}
                  {rollo.tela_color}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Ingreso: {new Date(rollo.fecha_ingreso).toLocaleDateString('es-PE')}
                </div>
              </div>
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
