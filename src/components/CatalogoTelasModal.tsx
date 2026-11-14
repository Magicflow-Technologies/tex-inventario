import React, { useState, useMemo } from 'react';
import { Tela } from '../types/inventory';
import { inventoryStore, normalizeLinea, normalizeSpaces } from '../services/inventoryStore';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  ChevronDown,
  ChevronRight,
  Palette,
  Layers,
} from 'lucide-react';

interface CatalogoTelasModalProps {
  telas: Tela[];
  onOpenIngresoConTela?: (telaId: string) => void;
}

interface ArticuloCatalogoGroup {
  codigo: string;
  linea: string;
  nombreBase: string;
  ancho: number;
  precioMayorista: number;
  precioConfeccionista: number;
  colores: Tela[];
}

function getColorHex(colorText?: string): string {
  const c = (colorText || '').toLowerCase();
  if (c.includes('negro')) return '#09090b';
  if (c.includes('azul noche')) return '#0f172a';
  if (c.includes('azul intermedio')) return '#1d4ed8';
  if (c.includes('azul marino')) return '#2563eb';
  if (c.includes('azul')) return '#2563eb';
  if (c.includes('charcoal sin puntos')) return '#475569';
  if (c.includes('charcoal')) return '#334155';
  if (c.includes('plomo cochino')) return '#64748b';
  if (c.includes('plomo intermedio')) return '#94a3b8';
  if (c.includes('plomo cenizo')) return '#a1a1aa';
  if (c.includes('plomo') || c.includes('gris')) return '#64748b';
  if (c.includes('silka') || c.includes('beige') || c.includes('arena')) return '#78716c';
  if (c.includes('grafito')) return '#52525b';
  if (c.includes('ginda') || c.includes('guinda') || c.includes('vino') || c.includes('rojo'))
    return '#881337';
  if (c.includes('verde')) return '#047857';
  if (c.includes('marron') || c.includes('marrón') || c.includes('cafe')) return '#78350f';
  return '#1d4ed8';
}

export const CatalogoTelasModal: React.FC<CatalogoTelasModalProps> = ({
  telas,
  onOpenIngresoConTela,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [articulosAbiertos, setArticulosAbiertos] = useState<Record<string, boolean>>({});

  // =========================================================================
  // MODAL 1: CREAR O EDITAR CÓDIGO DE ARTÍCULO (CON P. MAYORISTA Y P. CONFECCIONISTA)
  // =========================================================================
  const [isArticuloModalOpen, setIsArticuloModalOpen] = useState(false);
  const [editingCodigoOriginal, setEditingCodigoOriginal] = useState<string | null>(null);
  const [artCodigo, setArtCodigo] = useState('');
  const [artNombre, setArtNombre] = useState('');
  const [artLinea, setArtLinea] = useState('Moda Masculino');
  const [artPrecioMayorista, setArtPrecioMayorista] = useState('12.50');
  const [artPrecioConfeccionista, setArtPrecioConfeccionista] = useState('13.50');
  const [artAncho, setArtAncho] = useState('1.60');
  // Primer color al crear un nuevo Código de Artículo desde cero
  const [primerCodigoColor, setPrimerCodigoColor] = useState('');
  const [primerNombreColor, setPrimerNombreColor] = useState('');
  const [primerStockMinimo, setPrimerStockMinimo] = useState('1000');
  const [artFormError, setArtFormError] = useState<string | null>(null);

  // =========================================================================
  // MODAL 2: RELACIONAR / EDITAR CÓDIGO DE COLOR QUE PERTENECE A UN ARTÍCULO
  // =========================================================================
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [editingColorTela, setEditingColorTela] = useState<Tela | null>(null);
  const [colorArticuloCodigo, setColorArticuloCodigo] = useState('');
  const [codigoColor, setCodigoColor] = useState('');
  const [colorNombre, setColorNombre] = useState('');
  const [nombreVariante, setNombreVariante] = useState('');
  const [stockMinimo, setStockMinimo] = useState('1000');
  const [activo, setActivo] = useState(true);
  const [fechaRegistroDisplay, setFechaRegistroDisplay] = useState('');
  const [colorFormError, setColorFormError] = useState<string | null>(null);

  // Agrupar el catálogo por Código de Artículo
  const articulosAgrupados = useMemo<ArticuloCatalogoGroup[]>(() => {
    const map = new Map<string, ArticuloCatalogoGroup>();
    const q = searchQuery.trim().toLowerCase();

    telas.forEach((t) => {
      const cod = normalizeSpaces(t.codigo).toUpperCase();
      const lineaNorm = normalizeLinea(t.linea);
      const nombreLimpio = normalizeSpaces(t.nombre).replace(/8Tex/g, '8tex');
      const pMay = Number(t.precio_mayorista ?? t.precio_lista ?? 12.5);
      const pConf = Number(t.precio_confeccionista ?? t.precio_lista ?? pMay);

      if (q) {
        const match =
          cod.toLowerCase().includes(q) ||
          nombreLimpio.toLowerCase().includes(q) ||
          (t.codigo_color && t.codigo_color.toLowerCase().includes(q)) ||
          (t.color && t.color.toLowerCase().includes(q)) ||
          lineaNorm.toLowerCase().includes(q) ||
          String(pMay).includes(q) ||
          String(pConf).includes(q);
        if (!match) return;
      }

      const existing = map.get(cod);
      if (!existing) {
        map.set(cod, {
          codigo: cod,
          linea: lineaNorm,
          nombreBase: nombreLimpio,
          ancho: Number(t.ancho) || 1.6,
          precioMayorista: pMay,
          precioConfeccionista: pConf,
          colores: [t],
        });
      } else {
        existing.colores.push(t);
        const partes = existing.nombreBase
          .split(' / ')
          .map((p) => normalizeSpaces(p).toLowerCase());
        if (!partes.includes(nombreLimpio.toLowerCase())) {
          existing.nombreBase = `${existing.nombreBase} / ${nombreLimpio}`;
        }
      }
    });

    return Array.from(map.values()).map((g) => ({
      ...g,
      colores: [...g.colores].sort((a, b) =>
        (a.codigo_color || '').localeCompare(b.codigo_color || '', undefined, { numeric: true })
      ),
    }));
  }, [telas, searchQuery]);

  // Lista de todos los artículos maestros únicos (sin filtro de búsqueda, para el selector de artículo)
  const todosLosArticulos = useMemo<ArticuloCatalogoGroup[]>(() => {
    const map = new Map<string, ArticuloCatalogoGroup>();
    telas.forEach((t) => {
      const cod = normalizeSpaces(t.codigo).toUpperCase();
      if (!map.has(cod)) {
        const pMay = Number(t.precio_mayorista ?? t.precio_lista ?? 12.5);
        const pConf = Number(t.precio_confeccionista ?? t.precio_lista ?? pMay);
        map.set(cod, {
          codigo: cod,
          linea: normalizeLinea(t.linea),
          nombreBase: normalizeSpaces(t.nombre).replace(/8Tex/g, '8tex'),
          ancho: Number(t.ancho) || 1.6,
          precioMayorista: pMay,
          precioConfeccionista: pConf,
          colores: [t],
        });
      } else {
        map.get(cod)!.colores.push(t);
      }
    });
    return Array.from(map.values());
  }, [telas]);

  const toggleArticulo = (codigo: string) => {
    setArticulosAbiertos((prev) => {
      const current = prev[codigo] ?? true; // Abierto por defecto
      return { ...prev, [codigo]: !current };
    });
  };

  // =========================================================================
  // HANDLERS MODAL 1: CÓDIGO DE ARTÍCULO (P. MAYORISTA Y P. CONFECCIONISTA)
  // =========================================================================
  const handleOpenNuevoArticulo = () => {
    setEditingCodigoOriginal(null);
    setArtCodigo('');
    setArtNombre('');
    setArtLinea('Moda Masculino');
    setArtPrecioMayorista('12.50');
    setArtPrecioConfeccionista('13.50');
    setArtAncho('1.60');
    setPrimerCodigoColor('');
    setPrimerNombreColor('');
    setPrimerStockMinimo('1000');
    setArtFormError(null);
    setIsArticuloModalOpen(true);
  };

  const handleOpenEditarArticulo = (grupo: ArticuloCatalogoGroup) => {
    setEditingCodigoOriginal(grupo.codigo);
    setArtCodigo(grupo.codigo);
    setArtNombre(grupo.colores[0]?.nombre || grupo.nombreBase.split(' / ')[0] || '');
    setArtLinea(grupo.linea);
    setArtPrecioMayorista(grupo.precioMayorista.toFixed(2));
    setArtPrecioConfeccionista(grupo.precioConfeccionista.toFixed(2));
    setArtAncho(grupo.ancho.toFixed(2));
    setArtFormError(null);
    setIsArticuloModalOpen(true);
  };

  const handleSaveArticuloMaestro = (e: React.FormEvent) => {
    e.preventDefault();
    setArtFormError(null);

    const cleanCodigo = artCodigo.trim().toUpperCase();
    if (!cleanCodigo) {
      setArtFormError('El Código de Artículo es obligatorio (ej. C-900).');
      return;
    }

    if (!artNombre.trim()) {
      setArtFormError('El Nombre del Artículo / Tela es obligatorio.');
      return;
    }

    const pMay = parseFloat(artPrecioMayorista);
    if (isNaN(pMay) || pMay < 0) {
      setArtFormError('Ingrese un P. Mayorista válido (ej. 12.50).');
      return;
    }

    const pConf = parseFloat(artPrecioConfeccionista);
    if (isNaN(pConf) || pConf < 0) {
      setArtFormError('Ingrese un P. Confeccionista válido (ej. 13.50).');
      return;
    }

    const anchoNum = parseFloat(artAncho);
    if (isNaN(anchoNum) || anchoNum <= 0) {
      setArtFormError('Ingrese un Ancho de Tela válido en metros (ej. 1.60).');
      return;
    }

    try {
      if (editingCodigoOriginal) {
        // Actualizar P. Mayorista, P. Confeccionista, Línea y Ancho en todos los colores de este Código de Artículo
        inventoryStore.saveArticuloMaestro({
          codigoOriginal: editingCodigoOriginal,
          nuevoCodigo: cleanCodigo,
          linea: artLinea.trim() || 'Moda Masculino',
          nombreBase: artNombre.trim(),
          precio_mayorista: Number(pMay.toFixed(2)),
          precio_confeccionista: Number(pConf.toFixed(2)),
          ancho: Number(anchoNum.toFixed(2)),
        });
      } else {
        // Crear nuevo Código de Artículo con su primer Código de Color asociado
        const cleanPrimerColor = primerCodigoColor.trim().replace(/[^0-9]/g, '');
        if (!cleanPrimerColor) {
          setArtFormError(
            'Ingrese el primer Código de Color (solo números, ej. 2001) para registrar el nuevo Código de Artículo.'
          );
          return;
        }
        inventoryStore.saveTela({
          codigo: cleanCodigo,
          codigo_color: cleanPrimerColor,
          nombre: artNombre.trim(),
          color: primerNombreColor.trim() || `Color ${cleanPrimerColor}`,
          linea: artLinea.trim() || 'Moda Masculino',
          precio_lista: Number(pMay.toFixed(2)),
          precio_mayorista: Number(pMay.toFixed(2)),
          precio_confeccionista: Number(pConf.toFixed(2)),
          ancho: Number(anchoNum.toFixed(2)),
          unidad_medida: 'METROS',
          stock_minimo_alerta: parseFloat(primerStockMinimo) || 0,
          activo: true,
        });
      }

      setIsArticuloModalOpen(false);
      setEditingCodigoOriginal(null);
    } catch (err: unknown) {
      setArtFormError(err instanceof Error ? err.message : 'Error al guardar el Código de Artículo');
    }
  };

  // =========================================================================
  // HANDLERS MODAL 2: RELACIONAR O EDITAR CÓDIGO DE COLOR DE UN ARTÍCULO
  // =========================================================================
  const handleOpenAgregarColor = (grupo?: ArticuloCatalogoGroup) => {
    const targetGrupo = grupo || todosLosArticulos[0];
    if (!targetGrupo) {
      handleOpenNuevoArticulo();
      return;
    }
    setEditingColorTela(null);
    setColorArticuloCodigo(targetGrupo.codigo);
    setCodigoColor('');
    setColorNombre('');
    setNombreVariante(targetGrupo.colores[0]?.nombre || targetGrupo.nombreBase.split(' / ')[0] || '');
    setStockMinimo('1000');
    setActivo(true);
    setFechaRegistroDisplay(
      new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
    );
    setColorFormError(null);
    setIsColorModalOpen(true);
  };

  const handleOpenEditarColor = (tela: Tela) => {
    setEditingColorTela(tela);
    setColorArticuloCodigo(normalizeSpaces(tela.codigo).toUpperCase());
    setCodigoColor(tela.codigo_color || '');
    setColorNombre(tela.color || '');
    setNombreVariante(tela.nombre || '');
    setStockMinimo(String(tela.stock_minimo_alerta || 0));
    setActivo(tela.activo);
    setFechaRegistroDisplay(
      new Date(tela.created_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
    );
    setColorFormError(null);
    setIsColorModalOpen(true);
  };

  const handleSaveColor = (e: React.FormEvent) => {
    e.preventDefault();
    setColorFormError(null);

    const cleanArtCod = colorArticuloCodigo.trim().toUpperCase();
    const cleanColorCod = codigoColor.trim().replace(/[^0-9]/g, '');

    if (!cleanArtCod) {
      setColorFormError('Seleccione el Código de Artículo al que pertenece este color.');
      return;
    }
    if (!cleanColorCod) {
      setColorFormError('El Código de Color es obligatorio (únicamente números, ej. 2004).');
      return;
    }

    // Buscar el artículo maestro para heredar automáticamente P. Mayorista, P. Confeccionista, Línea y Ancho
    const grupoPadre = todosLosArticulos.find((g) => g.codigo === cleanArtCod);
    const pMayHeredado = grupoPadre ? grupoPadre.precioMayorista : 12.5;
    const pConfHeredado = grupoPadre ? grupoPadre.precioConfeccionista : 13.5;
    const lineaHeredada = grupoPadre ? grupoPadre.linea : 'Moda Masculino';
    const anchoHeredado = grupoPadre ? grupoPadre.ancho : 1.6;
    const nombreArticuloFinal =
      nombreVariante.trim() ||
      (grupoPadre ? grupoPadre.colores[0]?.nombre || grupoPadre.nombreBase : 'Tela 8tex');

    try {
      inventoryStore.saveTela({
        id: editingColorTela ? editingColorTela.id : undefined,
        codigo: cleanArtCod,
        codigo_color: cleanColorCod,
        nombre: nombreArticuloFinal,
        color: colorNombre.trim() || `Color ${cleanColorCod}`,
        linea: lineaHeredada,
        precio_lista: pMayHeredado,
        precio_mayorista: pMayHeredado,
        precio_confeccionista: pConfHeredado,
        ancho: anchoHeredado,
        unidad_medida: 'METROS',
        stock_minimo_alerta: parseFloat(stockMinimo) || 0,
        activo,
      });

      setIsColorModalOpen(false);
      setEditingColorTela(null);
    } catch (err: unknown) {
      setColorFormError(err instanceof Error ? err.message : 'Error al guardar Código de Color');
    }
  };

  const handleDeleteTela = (tela: Tela) => {
    const rollosAsociados = inventoryStore.getRollos().filter((r) => r.tela_id === tela.id);
    const msg =
      rollosAsociados.length > 0
        ? `¿Estás seguro de eliminar el Código de Color "${tela.codigo_color} - ${tela.color}" (${tela.codigo})?\n\nEsto también eliminará sus ${rollosAsociados.length} rollo(s) registrado(s) en inventario.`
        : `¿Estás seguro de eliminar el Código de Color "${tela.codigo_color} - ${tela.color}" (${tela.codigo}) del catálogo?`;

    if (!window.confirm(msg)) return;
    try {
      inventoryStore.deleteTela(tela.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar color');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1a73e8] flex items-center justify-center shrink-0 border border-blue-100">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Catálogo de Artículos y Códigos de Color
            </h1>
            <p className="text-xs text-slate-500">
              Define <strong>P. Mayorista</strong> y <strong>P. Confeccionista</strong> por cada{' '}
              <strong>Código de Artículo</strong> y relaciónalo con sus <strong>Códigos de Color</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {todosLosArticulos.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenAgregarColor()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#1a73e8] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all whitespace-nowrap cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span>+ Relacionar Código de Color</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenNuevoArticulo}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Código de Artículo</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código de artículo (C-900), código de color (2004), color o línea..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100 shadow-2xs transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          <strong>{articulosAgrupados.length}</strong> código(s) de artículo ·{' '}
          <strong>{telas.length}</strong> códigos de color relacionados
        </div>
      </div>

      {/* Lista Jerárquica: Nivel 1 = Código de Artículo (con P. Mayorista y P. Confeccionista) -> Nivel 2 = Códigos de Color */}
      <div className="space-y-5">
        {articulosAgrupados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              No se encontraron artículos ni códigos de color en el catálogo.
            </p>
          </div>
        ) : (
          articulosAgrupados.map((grupo) => {
            const isAbierto = articulosAbiertos[grupo.codigo] ?? true;

            return (
              <div
                key={grupo.codigo}
                className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs"
              >
                {/* NIVEL 1: CABECERA DEL CÓDIGO DE ARTÍCULO (PRECIOS MAYORISTA Y CONFECCIONISTA AQUÍ) */}
                <div
                  onClick={() => toggleArticulo(grupo.codigo)}
                  className="px-5 py-4 bg-slate-50/90 hover:bg-blue-50/30 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="px-3.5 h-10 rounded-xl bg-white text-slate-900 font-mono text-sm font-black flex items-center justify-center shrink-0 border-2 border-slate-400 shadow-2xs">
                      {isAbierto ? (
                        <ChevronDown className="w-4 h-4 text-blue-600 mr-1" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 mr-1" />
                      )}
                      <span>{grupo.codigo}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-black text-slate-900">
                          Línea {grupo.linea} ({grupo.codigo})
                        </h2>
                        <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {grupo.colores.length}{' '}
                          {grupo.colores.length === 1 ? 'código de color' : 'códigos de color'}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          · Ancho: <strong className="text-slate-800">{grupo.ancho.toFixed(2)} m</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-semibold mt-0.5 truncate">
                        {grupo.nombreBase}
                      </p>
                    </div>
                  </div>

                  {/* Precios del Código de Artículo + Acciones del Artículo */}
                  <div
                    className="flex flex-wrap items-center gap-3 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Tarjeta P. Mayorista del Artículo */}
                    <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        P. Mayorista
                      </span>
                      <span className="text-sm font-black text-emerald-900 font-mono">
                        S/. {grupo.precioMayorista.toFixed(2)}{' '}
                        <span className="text-[10px] font-sans font-semibold text-emerald-700">
                          /m
                        </span>
                      </span>
                    </div>

                    {/* Tarjeta P. Confeccionista del Artículo */}
                    <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                        P. Confeccionista
                      </span>
                      <span className="text-sm font-black text-indigo-900 font-mono">
                        S/. {grupo.precioConfeccionista.toFixed(2)}{' '}
                        <span className="text-[10px] font-sans font-semibold text-indigo-700">
                          /m
                        </span>
                      </span>
                    </div>

                    {/* Botón Editar Precios / Datos del Código de Artículo */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditarArticulo(grupo)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                      title="Editar P. Mayorista, P. Confeccionista, Línea o Ancho de este Código de Artículo"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Editar Artículo / Precios</span>
                    </button>

                    {/* Botón Agregar Código de Color a este Artículo */}
                    <button
                      type="button"
                      onClick={() => handleOpenAgregarColor(grupo)}
                      className="px-3.5 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Agregar Color</span>
                    </button>
                  </div>
                </div>

                {/* NIVEL 2: TABLA DE CÓDIGOS DE COLOR QUE PERTENECEN A ESTE CÓDIGO DE ARTÍCULO */}
                {isAbierto && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold text-[11px]">
                        <tr>
                          <th className="py-2.5 pl-5 pr-3">Cód. Color</th>
                          <th className="py-2.5 px-3">Variante de Color</th>
                          <th className="py-2.5 px-3">Nombre / Descripción</th>
                          <th className="py-2.5 px-3 text-right">P. Mayorista</th>
                          <th className="py-2.5 px-3 text-right">P. Confeccionista</th>
                          <th className="py-2.5 px-3 text-right">Stock Mín. (m)</th>
                          <th className="py-2.5 px-3">Fecha Registro</th>
                          <th className="py-2.5 px-3 text-center">Estado</th>
                          <th className="py-2.5 pl-3 pr-5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {grupo.colores.map((tela) => {
                          const hex = getColorHex(tela.color);
                          return (
                            <tr key={tela.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 pl-5 pr-3 whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <span
                                    className="w-3 h-5 rounded-full shrink-0 border border-black/10"
                                    style={{ backgroundColor: hex }}
                                  />
                                  <span className="px-2.5 py-0.5 rounded-lg bg-white text-slate-900 border-2 border-slate-400 font-mono font-black text-xs">
                                    {tela.codigo_color || 'S/N'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-extrabold text-blue-700">
                                {tela.color}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {tela.nombre}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                                S/. {grupo.precioMayorista.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700 tabular-nums whitespace-nowrap">
                                S/. {grupo.precioConfeccionista.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">
                                {(Number(tela.stock_minimo_alerta) || 0).toFixed(2)} m
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(tela.created_at).toLocaleDateString('es-PE', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-3 text-center">
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
                              <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditarColor(tela)}
                                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="Editar Código de Color"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTela(tela)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar Código de Color"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {onOpenIngresoConTela && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenIngresoConTela(tela.id)}
                                      className="px-2.5 py-1 text-xs font-semibold text-[#1a73e8] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all whitespace-nowrap cursor-pointer"
                                    >
                                      + Rollos
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          MODAL 1: CONFIGURAR CÓDIGO DE ARTÍCULO (P. MAYORISTA Y P. CONFECCIONISTA)
          ========================================================================= */}
      {isArticuloModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingCodigoOriginal
                      ? `Editar Código de Artículo (${editingCodigoOriginal})`
                      : 'Nuevo Código de Artículo'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    El <strong>P. Mayorista</strong> y <strong>P. Confeccionista</strong> se aplican a
                    todos los códigos de color de este artículo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArticuloModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticuloMaestro} className="p-6 space-y-4 text-xs">
              {artFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                  {artFormError}
                </div>
              )}

              {/* Fila 1: Código de Artículo y Línea */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código de Artículo *{' '}
                    <span className="font-normal text-slate-500">(letras y números)</span>
                  </label>
                  <input
                    type="text"
                    value={artCodigo}
                    onChange={(e) => setArtCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej. C-900 o L-200"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-[#1a73e8] font-bold focus:bg-white focus:outline-none focus:border-[#1a73e8] focus:ring-3 focus:ring-blue-100"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Línea * <span className="font-normal text-slate-500">(texto)</span>
                  </label>
                  <input
                    type="text"
                    value={artLinea}
                    onChange={(e) => setArtLinea(e.target.value)}
                    placeholder="Ej. Moda Masculino"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
              </div>

              {/* Fila 2: Nombre de la Tela / Artículo y Ancho */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de la Tela / Artículo *
                  </label>
                  <input
                    type="text"
                    value={artNombre}
                    onChange={(e) => setArtNombre(e.target.value)}
                    placeholder="Ej. Casimir C/Entero 8tex"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Ancho de Tela *</span>
                    <span className="text-[#1a73e8] font-mono text-[11px]">(metros)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={artAncho}
                      onChange={(e) => setArtAncho(e.target.value)}
                      placeholder="1.60"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3.5 pr-8 py-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">
                      m
                    </span>
                  </div>
                </div>
              </div>

              {/* Fila 3: P. Mayorista y P. Confeccionista (A NIVEL DE CÓDIGO DE ARTÍCULO) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Precios por Metro del Artículo ({artCodigo || 'Nuevo Artículo'})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>P. Mayorista *</span>
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
                        value={artPrecioMayorista}
                        onChange={(e) => setArtPrecioMayorista(e.target.value)}
                        placeholder="12.50"
                        className="w-full bg-emerald-50/70 border border-emerald-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-extrabold text-emerald-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>P. Confeccionista *</span>
                      <span className="text-indigo-700 font-mono text-[11px]">(S/. / m)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">
                        S/.
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={artPrecioConfeccionista}
                        onChange={(e) => setArtPrecioConfeccionista(e.target.value)}
                        placeholder="13.50"
                        className="w-full bg-indigo-50/70 border border-indigo-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-extrabold text-indigo-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Si es un nuevo Código de Artículo, pedir su primer Código de Color asociado */}
              {!editingCodigoOriginal && (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2.5">
                  <div className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider">
                    Primer Código de Color Asociado
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Código Color * <span className="font-normal text-slate-500">(números)</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={primerCodigoColor}
                        onChange={(e) =>
                          setPrimerCodigoColor(e.target.value.replace(/[^0-9]/g, ''))
                        }
                        placeholder="Ej. 2001"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1a73e8]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nombre del Color *
                      </label>
                      <input
                        type="text"
                        value={primerNombreColor}
                        onChange={(e) => setPrimerNombreColor(e.target.value)}
                        placeholder="Ej. Azul Noche"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#1a73e8]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Stock Mínimo (m)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={primerStockMinimo}
                        onChange={(e) => setPrimerStockMinimo(e.target.value)}
                        placeholder="1000"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-[#1a73e8]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsArticuloModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {editingCodigoOriginal ? 'Guardar Precios y Artículo' : 'Registrar Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: RELACIONAR O EDITAR UN CÓDIGO DE COLOR DE UN ARTÍCULO EXISTENTE
          ========================================================================= */}
      {isColorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingColorTela
                      ? `Editar Código de Color (${editingColorTela.codigo_color})`
                      : 'Relacionar Nuevo Código de Color'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Hereda automáticamente <strong>P. Mayorista</strong> y{' '}
                    <strong>P. Confeccionista</strong> del Código de Artículo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsColorModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveColor} className="p-6 space-y-4 text-xs">
              {colorFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                  {colorFormError}
                </div>
              )}

              {/* Selector del Código de Artículo Padre */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código de Artículo al que pertenece *
                </label>
                <select
                  value={colorArticuloCodigo}
                  onChange={(e) => {
                    const selectedCod = e.target.value;
                    setColorArticuloCodigo(selectedCod);
                    const grp = todosLosArticulos.find((g) => g.codigo === selectedCod);
                    if (grp && !editingColorTela) {
                      setNombreVariante(
                        grp.colores[0]?.nombre || grp.nombreBase.split(' / ')[0] || ''
                      );
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-bold text-[#1a73e8] focus:bg-white focus:outline-none focus:border-[#1a73e8] cursor-pointer"
                >
                  {todosLosArticulos.map((g) => (
                    <option key={g.codigo} value={g.codigo}>
                      {g.codigo} — Línea {g.linea} (Mayorista: S/. {g.precioMayorista.toFixed(2)} |
                      Confeccionista: S/. {g.precioConfeccionista.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Código de Color y Nombre del Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código Color *{' '}
                    <span className="font-normal text-slate-500">(únicamente números)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={codigoColor}
                    onChange={(e) => setCodigoColor(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ej. 2004 o 4150"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre del Color *
                  </label>
                  <input
                    type="text"
                    value={colorNombre}
                    onChange={(e) => setColorNombre(e.target.value)}
                    placeholder="Ej. Azul Marino claro"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
              </div>

              {/* Nombre Comercial y Stock Mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de la Tela / Artículo
                  </label>
                  <input
                    type="text"
                    value={nombreVariante}
                    onChange={(e) => setNombreVariante(e.target.value)}
                    placeholder="Ej. Casimir C/Entero 8tex"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
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
                    placeholder="1000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              {/* Fecha de Registro Automática */}
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
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsColorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {editingColorTela ? 'Guardar Cambios' : 'Relacionar Color'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
