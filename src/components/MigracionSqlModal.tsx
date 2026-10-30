import React, { useState } from 'react';
import { generatePostgreSqlMigrationScript } from '../services/migrationSql';
import { inventoryStore } from '../services/inventoryStore';
import {
  X,
  Database,
  Copy,
  Check,
  Download,
  RotateCcw,
  FileCode,
  ShieldCheck,
} from 'lucide-react';

interface MigracionSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset: () => void;
}

export const MigracionSqlModal: React.FC<MigracionSqlModalProps> = ({
  isOpen,
  onClose,
  onDataReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const sqlScript = generatePostgreSqlMigrationScript();

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlScript], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `8tex_inventario_migracion_${new Date().toISOString().split('T')[0]}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    inventoryStore.resetToDefaults(true);
    onDataReset();
    setConfirmReset(false);
  };

  const handleExportJson = () => {
    const raw = inventoryStore.getRawData();
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `8tex_inventario_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        inventoryStore.importRawData(json);
        onDataReset();
        alert('Datos importados correctamente.');
      } catch (err) {
        alert('Error al leer el archivo JSON de respaldo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Sección 5: Guía y Script de Base de Datos Desacoplada (PostgreSQL / Supabase)
              </h2>
              <p className="text-xs text-slate-500">
                Volcado DDL + DML con llaves primarias UUIDv4 nativas y desacoplamiento comercial.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Card explicativa de los 3 principios de migración */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-[#1a73e8] font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Reglas de Base de Datos Desacoplada (Textiles Ocho Lukal E.I.R.L.)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 pt-1">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <strong className="text-slate-900 block mb-1">1. Integridad Referencial:</strong>
                Todas las tablas (<code className="text-[#1a73e8] font-mono">telas</code>, <code className="text-[#1a73e8] font-mono">rollos</code>) usan UUIDv4, lo que permite volcarlas en Supabase sin colisión de IDs.
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <strong className="text-slate-900 block mb-1">2. Desacoplamiento Comercial:</strong>
                El campo <code className="text-[#1a73e8] font-mono">entidad_origen_destino</code> y documentos SUNAT se guardan de forma aislada para operar de inmediato sin esperar módulos externos.
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <strong className="text-slate-900 block mb-1">3. Conexión a Pedidos:</strong>
                La tabla de ventas <code className="text-[#1a73e8] font-mono">pedido_detalles</code> enlaza exclusivamente por <code className="text-[#1a73e8] font-mono">rollo_id</code> reservando y vendiendo rollos de forma atómica.
              </div>
            </div>
          </div>

          {/* Visualizador de Script SQL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#1a73e8]" />
                <span>Script SQL Listo para el SQL Editor de Supabase / PostgreSQL:</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar SQL'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .sql</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-900 text-emerald-400 border border-slate-800 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 select-all shadow-inner">
              {sqlScript}
            </pre>
          </div>

          {/* Opciones de Backup JSON y Restauración de Fábrica */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 rounded-xl transition-all whitespace-nowrap cursor-pointer"
              >
                Exportar Backup JSON
              </button>

              <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 rounded-xl transition-all whitespace-nowrap cursor-pointer">
                <span>Restaurar Backup JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="px-3 py-2 text-slate-500 hover:text-rose-600 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer datos demo de 8tex</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-rose-600 font-semibold">¿Seguro que deseas reiniciar el almacén?</span>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Sí, reiniciar
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
