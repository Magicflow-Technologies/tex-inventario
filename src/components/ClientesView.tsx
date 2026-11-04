import React, { useState, useMemo } from 'react';
import { Cliente } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  X,
  Check,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';

interface ClientesViewProps {
  clientes: Cliente[];
  onSeleccionarParaPos?: (cliente: Cliente) => void;
  onNotify?: (title: string, description: string) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clientes,
  onSeleccionarParaPos,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);

  // Campos del formulario
  const [razonSocial, setRazonSocial] = useState('');
  const [ruc, setRuc] = useState('');
  const [correos, setCorreos] = useState('');
  const [telefonos, setTelefonos] = useState('');
  const [direccion, setDireccion] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Búsqueda completa por cualquier columna y múltiples palabras
  const clientesFiltrados = useMemo(() => {
    const tokens = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) return clientes;

    return clientes.filter((c) => {
      const fullText = [
        c.razon_social,
        c.ruc,
        c.correos || '',
        c.telefonos || '',
        c.direccion || '',
        c.nombre_contacto || '',
        c.observaciones || '',
      ]
        .join(' ')
        .toLowerCase();

      return tokens.every((tok) => fullText.includes(tok));
    });
  }, [clientes, searchQuery]);

  const handleOpenNuevo = () => {
    setEditingClienteId(null);
    setRazonSocial('');
    setRuc('');
    setCorreos('');
    setTelefonos('');
    setDireccion('');
    setNombreContacto('');
    setObservaciones('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditar = (c: Cliente) => {
    setEditingClienteId(c.id);
    setRazonSocial(c.razon_social);
    setRuc(c.ruc);
    setCorreos(c.correos || '');
    setTelefonos(c.telefonos || '');
    setDireccion(c.direccion || '');
    setNombreContacto(c.nombre_contacto || '');
    setObservaciones(c.observaciones || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleDelete = (c: Cliente) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar al cliente "${c.razon_social}" (RUC: ${c.ruc})?`
      )
    )
      return;

    try {
      inventoryStore.deleteCliente(c.id);
      if (onNotify) {
        onNotify(
          'Cliente Eliminado',
          `Se eliminó a "${c.razon_social}" del directorio de clientes.`
        );
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar cliente');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const saved = inventoryStore.saveCliente({
        id: editingClienteId || undefined,
        razon_social: razonSocial,
        ruc,
        correos,
        telefonos,
        direccion,
        nombre_contacto: nombreContacto,
        observaciones,
      });

      setIsModalOpen(false);
      if (onNotify) {
        onNotify(
          editingClienteId ? 'Cliente Actualizado' : 'Cliente Registrado',
          `"${saved.razon_social}" (RUC: ${saved.ruc}) se guardó y ya está disponible en el POS.`
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar cliente');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1a73e8] text-[11px] sm:text-xs font-semibold mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Directorio Comercial · Sincronizado con POS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Registro de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Administra los clientes de Textiles Ocho Lukal E.I.R.L. para seleccionarlos rápidamente al realizar una venta en el POS.
          </p>
        </div>

        <button
          onClick={handleOpenNuevo}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all whitespace-nowrap self-stretch sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Cliente</span>
        </button>
      </div>

      {/* Buscador y Contador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por razón social, RUC, contacto, teléfonos, correo o dirección..."
            className="w-full bg-white border border-slate-300 rounded-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-2xs focus:outline-none focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 sm:self-center">
          Mostrando <strong className="text-slate-900">{clientesFiltrados.length}</strong> de{' '}
          <strong className="text-slate-900">{clientes.length}</strong> clientes registrados
        </div>
      </div>

      {/* Estado Vacío */}
      {clientesFiltrados.length === 0 ? (
        <div className="p-10 text-center border border-slate-200 rounded-2xl bg-white shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1a73e8] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery
              ? 'No se encontraron clientes con ese filtro'
              : 'Aún no hay clientes registrados'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Registra aquí la Razón Social, RUC, correos, teléfonos, dirección, nombre de contacto y observaciones para usarlos directamente en el Punto de Venta (POS).
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenNuevo}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primer Cliente</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ================= VISTA MÓVIL (TARJETAS PARA CELULAR, md:hidden) ================= */}
          <div className="md:hidden space-y-3">
            {clientesFiltrados.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[#1a73e8] font-mono text-[11px] font-bold border border-blue-200 mb-1">
                      RUC: {c.ruc}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {c.razon_social}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditar(c)}
                      className="p-2 text-slate-500 hover:text-[#1a73e8] bg-slate-100 rounded-xl"
                      title="Editar cliente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-xl"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {c.nombre_contacto && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        <strong className="text-slate-800">Contacto:</strong> {c.nombre_contacto}
                      </span>
                    </div>
                  )}
                  {c.telefonos && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono">{c.telefonos}</span>
                    </div>
                  )}
                  {c.correos && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{c.correos}</span>
                    </div>
                  )}
                  {c.direccion && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{c.direccion}</span>
                    </div>
                  )}
                  {c.observaciones && (
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-200/70 text-[11px] text-slate-500 italic">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{c.observaciones}</span>
                    </div>
                  )}
                </div>

                {onSeleccionarParaPos && (
                  <button
                    onClick={() => onSeleccionarParaPos(c)}
                    className="w-full py-2 px-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Vender a este Cliente en POS</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ================= VISTA ESCRITORIO (TABLA COMPLETA, hidden md:block) ================= */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Razón Social</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">RUC / Doc.</th>
                    <th className="py-3.5 px-3">Nombre de Contacto</th>
                    <th className="py-3.5 px-3">Teléfonos</th>
                    <th className="py-3.5 px-3">Correos</th>
                    <th className="py-3.5 px-3">Dirección</th>
                    <th className="py-3.5 px-3">Observaciones</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesFiltrados.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {c.razon_social}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-[#1a73e8] whitespace-nowrap">
                        {c.ruc}
                      </td>
                      <td className="py-3.5 px-3 text-slate-800 font-medium">
                        {c.nombre_contacto || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {c.telefonos || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700">
                        {c.correos || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 max-w-[200px] truncate" title={c.direccion}>
                        {c.direccion || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 italic max-w-[180px] truncate" title={c.observaciones}>
                        {c.observaciones || <span className="text-slate-400 not-italic">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {onSeleccionarParaPos && (
                            <button
                              onClick={() => onSeleccionarParaPos(c)}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Ir al POS con este cliente seleccionado"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Usar en POS</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditar(c)}
                            className="p-1.5 text-slate-500 hover:text-[#1a73e8] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= MODAL CREAR / EDITAR CLIENTE ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#1a73e8] border border-blue-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingClienteId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Disponible inmediatamente en la lista del Punto de Venta (POS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Razón Social / Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Ej. Confecciones D'Moda S.A.C."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">
                    RUC / DNI *
                  </label>
                  <input
                    type="text"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    placeholder="Ej. 20601234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de Contacto
                  </label>
                  <input
                    type="text"
                    value={nombreContacto}
                    onChange={(e) => setNombreContacto(e.target.value)}
                    placeholder="Ej. Sr. Roberto Gómez (Jefe de Compras)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfonos
                  </label>
                  <input
                    type="text"
                    value={telefonos}
                    onChange={(e) => setTelefonos(e.target.value)}
                    placeholder="Ej. 998 112 233 / (01) 428-9900"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correos Electrónicos
                  </label>
                  <input
                    type="text"
                    value={correos}
                    onChange={(e) => setCorreos(e.target.value)}
                    placeholder="Ej. compras@dmoda.pe, facturacion@dmoda.pe"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dirección Fiscal / Despacho
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej. Jr. Gamarra 840 Int. 201 - La Victoria"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej. Cliente frecuente mayorista, despacho por agencia o recojo en tienda..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#1a73e8] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingClienteId ? 'Guardar Cambios' : 'Guardar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
