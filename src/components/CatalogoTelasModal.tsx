import React, { useState } from 'react';
import { Tela } from '../types/inventory';
import { inventoryStore, normalizeLinea } from '../services/inventoryStore';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  Maximize2,
  Ruler,
  Hash,
  Palette,
} from 'lucide-react';

interface CatalogoTelasModalProps {
  telas: Tela[];
  onOpenIngresoConTela?: (telaId: string) => void;
}

export const CatalogoTelasModal: React.FC<CatalogoTelasModalProps> = ({
  telas,
  onOpenIngresoConTela,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTela, setEditingTela] = useState<Tela | null>(null);

  // Form states del Catálogo Maestro de Telas:
  // 1. Código de artículo: (permite número y letras, repetible para distintos códigos de color)
  const [codigoArticulo, setCodigoArticulo] = useState('');
  // 2. Código Color: (permite número)
  const [codigoColor, setCodigoColor] = useState('');
  // Nombre descriptivo y color
  const [nombre, setNombre] = useState('');
  const [colorNombre, setColorNombre] = useState('');
  // 3. Línea: (texto)
  const [linea, setLinea] = useState('');
  // 4. Precio de Lista: (numérico con decimal)
  const [precioLista, setPrecioLista] = useState('12.50');
  // 5. Ancho: (unidad de medida metros)
  const [ancho, setAncho] = useState('1.50');
  // 6. Fecha: (de registro automático)
  const [fechaRegistroDisplay, setFechaRegistroDisplay] = useState('');

  const [stockMinimo, setStockMinimo] = useState('100.00');
  const [activo, setActivo] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = telas.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.nombre.toLowerCase().includes(q) ||
      t.codigo.toLowerCase().includes(q) ||
      (t.codigo_color && t.codigo_color.toLowerCase().includes(q)) ||
      (t.color && t.color.toLowerCase().includes(q)) ||
      (t.linea && t.linea.toLowerCase().includes(q)) ||
      String(t.precio_lista || '').includes(q)
    );
  });

  const handleOpenCreate = () => {
    setEditingTela(null);
    setCodigoArticulo('');
    setCodigoColor('');
    setNombre('');
    setColorNombre('');
    setLinea('Sastrería Formal');
    setPrecioLista('12.50');
    setAncho('1.50');
    setFechaRegistroDisplay(new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }));
    setStockMinimo('100.00');
    setActivo(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tela: Tela) => {
    setEditingTela(tela);
    setCodigoArticulo(tela.codigo);
    setCodigoColor(tela.codigo_color || '');
    setNombre(tela.nombre);
    setColorNombre(tela.color);
    setLinea(tela.linea || '');
    setPrecioLista(Number(tela.precio_lista || 12.5).toFixed(2));
    setAncho(String(tela.ancho || 1.5));
    setFechaRegistroDisplay(
      new Date(tela.created_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
    );
    setStockMinimo(String(tela.stock_minimo_alerta));
    setActivo(tela.activo);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Validación y control de código de color solo números
  const handleCodigoColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, ''); // Permite únicamente números
    setCodigoColor(val);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCodigo = codigoArticulo.trim().toUpperCase();
    const cleanColorCode = codigoColor.trim();

    // Validación Código de artículo (permite letras y números, repetible con distinto código de color)
    if (!cleanCodigo) {
      setFormError('El Código de Artículo es obligatorio (permite números y letras).');
      return;
    }

    // Validación Código de color (permite número)
    if (!cleanColorCode) {
      setFormError('El Código de Color es obligatorio (permite únicamente números).');
      return;
    }

    // Validar conflicto únicamente si coinciden tanto codigo_articulo como codigo_color
    const existeCombinacion = telas.some(
      (t) =>
        t.id !== editingTela?.id &&
        t.codigo.trim().toUpperCase() === cleanCodigo &&
        String(t.codigo_color || '').trim() === cleanColorCode
    );
    if (existeCombinacion) {
      setFormError(
        `Ya existe el artículo "${cleanCodigo}" registrado con el Código de Color "${cleanColorCode}". Cambie el código de color para registrar una nueva variante.`
      );
      return;
    }

    if (!nombre.trim()) {
      setFormError('El Nombre comercial de la tela es obligatorio.');
      return;
    }

    const anchoNum = parseFloat(ancho);
    if (isNaN(anchoNum) || anchoNum <= 0) {
      setFormError('El Ancho debe ser un número válido mayor a 0 (unidad de medida: metros, ej. 1.50).');
      return;
    }

    const precioListaNum = parseFloat(precioLista);
    if (isNaN(precioListaNum) || precioListaNum < 0) {
      setFormError('El Precio de Lista debe ser un número válido con decimales (ej. 12.50).');
      return;
    }

    try {
      inventoryStore.saveTela({
        id: editingTela ? editingTela.id : undefined,
        codigo: cleanCodigo,
        codigo_color: cleanColorCode,
        nombre: nombre.trim(),
        color: colorNombre.trim() || `Color ${cleanColorCode}`,
        linea: linea.trim() || 'Línea General',
        precio_lista: Number(precioListaNum.toFixed(2)),
        ancho: anchoNum,
        unidad_medida: 'METROS',
        stock_minimo_alerta: parseFloat(stockMinimo) || 0,
        activo,
      });

      setIsFormOpen(false);
      setEditingTela(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar tela';
      setFormError(msg);
    }
  };

  const handleDeleteTela = (tela: Tela) => {
    const rollosAsociados = inventoryStore.getRollos().filter((r) => r.tela_id === tela.id);
    const msg =
      rollosAsociados.length > 0
        ? `¿Estás seguro de eliminar el artículo "${tela.nombre}" (${tela.codigo})?\n\nEsto también eliminará sus ${rollosAsociados.length} rollo(s) registrado(s) en inventario.`
        : `¿Estás seguro de eliminar el artículo "${tela.nombre}" (${tela.codigo}) del catálogo?`;

    if (!window.confirm(msg)) return;
    try {
      inventoryStore.deleteTela(tela.id);
      if (editingTela?.id === tela.id) {
        setIsFormOpen(false);
        setEditingTela(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar tela');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-[#1a73e8] text-xs font-semibold mb-2">
            <Tag className="w-3.5 h-3.5" />
            <span>Maestro de Artículos Textiles</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Catálogo Maestro de Telas y Artículos
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Registro maestro por variante de color: un mismo Código de Artículo (ej. C-900) puede registrarse múltiples veces con diferentes Códigos de Color. El metraje exacto y lote se asignan por rollo físico al ingresar mercadería.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Registrar Nueva Tela</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código de artículo, código de color, color, línea o nombre..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 shadow-sm transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {filtered.length} artículos en catálogo
        </div>
      </div>

      {/* Tabla de Telas con los campos requeridos */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3">Código Artículo</th>
                <th className="py-3 px-3">Cód. Color</th>
                <th className="py-3 px-3">Nombre / Descripción</th>
                <th className="py-3 px-3">Línea</th>
                <th className="py-3 px-3 text-right">Precio de Lista</th>
                <th className="py-3 px-3 text-right">Ancho (m)</th>
                <th className="py-3 px-3 text-right">Stock Mín. (m)</th>
                <th className="py-3 px-3">Fecha Registro</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tela) => (
                <tr key={tela.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-bold text-[#1a73e8]">
                    {tela.codigo}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                    {tela.codigo_color || 'S/N'}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-slate-900">{tela.nombre}</div>
                    <div className="text-[11px] text-slate-500">{tela.color}</div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                    {normalizeLinea(tela.linea)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-700 tabular-nums whitespace-nowrap">
                    S/. {(Number(tela.precio_lista) || 0).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {(Number(tela.ancho) || 1.5).toFixed(2)} m
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                    {(Number(tela.stock_minimo_alerta) || 0).toFixed(2)} m
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(tela.created_at).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {tela.activo ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Activo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                        <XCircle className="w-3 h-3 text-slate-400" />
                        <span>Inactivo</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(tela)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Editar parámetros del artículo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTela(tela)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar artículo / tela"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {onOpenIngresoConTela && (
                        <button
                          onClick={() => onOpenIngresoConTela(tela.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#1a73e8] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all whitespace-nowrap cursor-pointer"
                        >
                          + Rollos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORMULARIO MODAL: Alta / Edición de Tela */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
            {/* Header del Formulario */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingTela ? 'Editar Tela / Artículo' : 'Registro de Nueva Tela'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Puedes usar el mismo Código de Artículo con diferentes Códigos de Color.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                  {formError}
                </div>
              )}

              {/* Grupo 1: Código de Artículo y Código de Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código de Artículo * <span className="font-normal text-slate-500">(letras y números)</span>
                  </label>
                  <input
                    type="text"
                    value={codigoArticulo}
                    onChange={(e) => setCodigoArticulo(e.target.value.toUpperCase())}
                    placeholder="Ej. C-900 o ART-TIZZ-001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-[#1a73e8] font-bold focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código Color * <span className="font-normal text-slate-500">(únicamente números)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={codigoColor}
                    onChange={handleCodigoColorChange}
                    placeholder="Ej. 2004 o 401"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Grupo 2: Nombre de la Tela y Color descriptivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de la Tela / Artículo *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Casimir M 8tex"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre del Color (Texto descriptivo)
                  </label>
                  <input
                    type="text"
                    value={colorNombre}
                    onChange={(e) => setColorNombre(e.target.value)}
                    placeholder="Ej. Azul Marino"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Grupo 3: Línea, Precio de Lista y Ancho (en metros) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Línea * <span className="font-normal text-slate-500">(texto)</span>
                  </label>
                  <input
                    type="text"
                    value={linea}
                    onChange={(e) => setLinea(e.target.value)}
                    placeholder="Ej. Moda Masculino"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Precio de Lista *</span>
                    <span className="text-emerald-700 font-mono text-[11px]">(S/. / m)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">
                      S/.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioLista}
                      onChange={(e) => setPrecioLista(e.target.value)}
                      placeholder="12.50"
                      className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl pl-9 pr-3 py-2 font-mono font-extrabold text-emerald-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Ancho de Tela *</span>
                    <span className="text-[#1a73e8] font-mono text-[11px]">(metros)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={ancho}
                      onChange={(e) => setAncho(e.target.value)}
                      placeholder="1.50"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3.5 pr-8 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 transition-all"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">
                      m
                    </span>
                  </div>
                </div>
              </div>

              {/* Grupo 4: Fecha de Registro Automático & Stock Mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fecha de Registro (Automática)</span>
                  </label>
                  <input
                    type="text"
                    value={fechaRegistroDisplay}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 font-mono text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Se almacena con TIMESTAMPTZ en la base de datos Supabase/PostgreSQL.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Umbral Stock Mínimo (Alerta Metros)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    placeholder="100"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  {editingTela ? 'Guardar Cambios' : 'Registrar Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
