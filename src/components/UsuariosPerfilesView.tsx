import React, { useState } from 'react';
import { Perfil, UsuarioConPerfil, PermisoModulo } from '../types/inventory';
import { inventoryStore } from '../services/inventoryStore';
import {
  Users,
  Shield,
  Plus,
  Edit2,
  X,
  CheckCircle2,
  XCircle,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';

interface UsuariosPerfilesViewProps {
  usuarios: UsuarioConPerfil[];
  perfiles: Perfil[];
  onNotify: (title: string, description: string) => void;
}

const ALL_PERMISOS: Array<{ id: PermisoModulo; label: string }> = [
  { id: 'stock', label: 'Stock Consolidado' },
  { id: 'pos', label: 'Punto de Venta (POS)' },
  { id: 'pedidos', label: 'Pedidos y Facturación SUNAT' },
  { id: 'trazabilidad', label: 'Trazabilidad Rollo' },
  { id: 'kardex', label: 'Kárdex de Movimientos' },
  { id: 'telas', label: 'Catálogo de Telas' },
  { id: 'ingreso', label: 'Registrar Ingresos (IN)' },
  { id: 'salida', label: 'Registrar Salidas (OUT)' },
  { id: 'usuarios', label: 'Usuarios y Perfiles' },
  { id: 'sql', label: 'Script SQL / Respaldo' },
];

export const UsuariosPerfilesView: React.FC<UsuariosPerfilesViewProps> = ({
  usuarios,
  perfiles,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'usuarios' | 'perfiles'>('usuarios');

  // Modal de Usuario
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioConPerfil | null>(null);
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [uNombre, setUNombre] = useState('');
  const [uCorreo, setUCorreo] = useState('');
  const [uTelefono, setUTelefono] = useState('');
  const [uCargo, setUCargo] = useState('');
  const [uPerfilId, setUPerfilId] = useState('');
  const [uActivo, setUActivo] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Modal de Perfil
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null);
  const [pCodigo, setPCodigo] = useState('');
  const [pNombre, setPNombre] = useState('');
  const [pDescripcion, setPDescripcion] = useState('');
  const [pPermisos, setPPermisos] = useState<PermisoModulo[]>([]);
  const [pActivo, setPActivo] = useState(true);
  const [perfilError, setPerfilError] = useState<string | null>(null);
  const [isSavingPerfil, setIsSavingPerfil] = useState(false);

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUUsername('');
    setUPassword('');
    setUNombre('');
    setUCorreo('');
    setUTelefono('');
    setUCargo('');
    setUPerfilId(perfiles[0]?.id || '');
    setUActivo(true);
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UsuarioConPerfil) => {
    setEditingUser(u);
    setUUsername(u.usuario);
    setUPassword('');
    setUNombre(u.nombre_completo);
    setUCorreo(u.correo || '');
    setUTelefono(u.telefono || '');
    setUCargo(u.cargo || '');
    setUPerfilId(u.perfil_id);
    setUActivo(u.activo);
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setIsSavingUser(true);
    try {
      await inventoryStore.saveUsuario({
        id: editingUser?.id,
        usuario: uUsername,
        password: uPassword || undefined,
        nombre_completo: uNombre,
        correo: uCorreo,
        telefono: uTelefono,
        cargo: uCargo,
        perfil_id: uPerfilId,
        activo: uActivo,
      });
      setIsUserModalOpen(false);
      onNotify(
        editingUser ? 'Usuario Actualizado' : 'Usuario Creado en ochotex_bd.usuarios',
        `El usuario "${uUsername}" fue guardado en Supabase.`
      );
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleOpenCreatePerfil = () => {
    setEditingPerfil(null);
    setPCodigo('');
    setPNombre('');
    setPDescripcion('');
    setPPermisos(['stock', 'trazabilidad']);
    setPActivo(true);
    setPerfilError(null);
    setIsPerfilModalOpen(true);
  };

  const handleOpenEditPerfil = (p: Perfil) => {
    setEditingPerfil(p);
    setPCodigo(p.codigo);
    setPNombre(p.nombre);
    setPDescripcion(p.descripcion || '');
    setPPermisos(Array.isArray(p.permisos) ? p.permisos : []);
    setPActivo(p.activo);
    setPerfilError(null);
    setIsPerfilModalOpen(true);
  };

  const togglePermiso = (perm: PermisoModulo) => {
    setPPermisos((prev) =>
      prev.includes(perm) ? prev.filter((item) => item !== perm) : [...prev, perm]
    );
  };

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setPerfilError(null);
    setIsSavingPerfil(true);
    try {
      await inventoryStore.savePerfil({
        id: editingPerfil?.id,
        codigo: pCodigo,
        nombre: pNombre,
        descripcion: pDescripcion,
        permisos: pPermisos,
        activo: pActivo,
      });
      setIsPerfilModalOpen(false);
      onNotify(
        editingPerfil ? 'Perfil Actualizado' : 'Perfil Creado en ochotex_bd.perfiles',
        `El perfil "${pNombre}" fue sincronizado con Supabase.`
      );
    } catch (err: unknown) {
      setPerfilError(err instanceof Error ? err.message : 'Error al guardar perfil');
    } finally {
      setIsSavingPerfil(false);
    }
  };

  const handleDeleteUser = async (u: UsuarioConPerfil) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar al usuario "${u.nombre_completo}" (@${u.usuario}) de ochotex_bd.usuarios?`
      )
    )
      return;
    try {
      await inventoryStore.deleteUsuario(u.id);
      onNotify('Usuario Eliminado', `El usuario @${u.usuario} fue eliminado de ochotex_bd.usuarios.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  };

  const handleDeletePerfil = async (p: Perfil) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el perfil "${p.nombre}" (${p.codigo}) de ochotex_bd.perfiles?`
      )
    )
      return;
    try {
      await inventoryStore.deletePerfil(p.id);
      onNotify('Perfil Eliminado', `El perfil ${p.nombre} fue eliminado de ochotex_bd.perfiles.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar perfil');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-[#1a73e8] text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Seguridad & Control de Acceso (ochotex_bd)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Gestión de Perfiles y Usuarios (Supabase)
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Administración en tiempo real de las tablas <code className="font-mono text-[#1a73e8] font-semibold">ochotex_bd.perfiles</code> y{' '}
            <code className="font-mono text-[#1a73e8] font-semibold">ochotex_bd.usuarios</code> utilizadas para validar el ingreso al sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleOpenCreatePerfil}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
          >
            <Shield className="w-4 h-4 text-[#1a73e8]" />
            <span>+ Nuevo Perfil</span>
          </button>
          <button
            onClick={handleOpenCreateUser}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Selector de sub-vista */}
      <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          onClick={() => setSubTab('usuarios')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'usuarios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-[#1a73e8]" />
          <span>Tabla Usuarios ({usuarios.length})</span>
        </button>
        <button
          onClick={() => setSubTab('perfiles')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'perfiles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-[#1a73e8]" />
          <span>Tabla Perfiles ({perfiles.length})</span>
        </button>
      </div>

      {/* TABLA 1: ochotex_bd.usuarios */}
      {subTab === 'usuarios' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Usuario Login</th>
                  <th className="py-3.5 px-4">Nombre Completo / Cargo</th>
                  <th className="py-3.5 px-4">Perfil Asignado</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4">Último Acceso</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1a73e8]">
                      {u.usuario}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{u.nombre_completo}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        <span>{u.cargo || 'Personal 8tex'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1a73e8] border border-blue-200 font-mono font-bold text-[11px]">
                        {u.perfil?.codigo || 'PERFIL'}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">{u.perfil?.nombre}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 space-y-0.5">
                      {u.correo && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{u.correo}</span>
                        </div>
                      )}
                      {u.telefono && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.telefono}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {u.ultimo_acceso ? (
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          {new Date(u.ultimo_acceso).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      ) : (
                        'Sin registro'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {u.activo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => void handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLA 2: ochotex_bd.perfiles */}
      {subTab === 'perfiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {perfiles.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1a73e8] border border-blue-200">
                      {p.codigo}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{p.nombre}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditPerfil(p)}
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Editar perfil"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => void handleDeletePerfil(p)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Eliminar perfil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600">{p.descripcion}</p>

                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Módulos autorizados ({p.permisos?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(p.permisos || []).map((perm) => (
                      <span
                        key={perm}
                        className="text-[11px] font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>UUID: {p.id.slice(0, 13)}...</span>
                <span className={p.activo ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {p.activo ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL USUARIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#1a73e8]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingUser ? `Editar Usuario (${editingUser.usuario})` : 'Registrar Nuevo Usuario en ochotex_bd'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              {userError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Usuario Login *</label>
                  <input
                    type="text"
                    value={uUsername}
                    onChange={(e) => setUUsername(e.target.value)}
                    placeholder="Ej. jperez"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-[#1a73e8]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      value={uPassword}
                      onChange={(e) => setUPassword(e.target.value)}
                      placeholder={editingUser ? 'Dejar vacío para mantener' : 'Contraseña de acceso'}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-9 py-2 font-mono text-slate-900"
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
                      title={showUserPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={uNombre}
                    onChange={(e) => setUNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Perfil (ochotex_bd.perfiles) *</label>
                  <select
                    value={uPerfilId}
                    onChange={(e) => setUPerfilId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    required
                  >
                    {perfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={uCargo}
                    onChange={(e) => setUCargo(e.target.value)}
                    placeholder="Ej. Almacenero"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo</label>
                  <input
                    type="email"
                    value={uCorreo}
                    onChange={(e) => setUCorreo(e.target.value)}
                    placeholder="usuario@8tex.pe"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={uTelefono}
                    onChange={(e) => setUTelefono(e.target.value)}
                    placeholder="999 888 777"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={uActivo}
                  onChange={(e) => setUActivo(e.target.checked)}
                  className="w-4 h-4 text-[#1a73e8] rounded"
                />
                <span className="font-semibold text-slate-700">Usuario Activo (Permitir inicio de sesión)</span>
              </label>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  {isSavingUser ? 'Guardando...' : 'Guardar en Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERFIL */}
      {isPerfilModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#1a73e8]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingPerfil ? `Editar Perfil (${editingPerfil.codigo})` : 'Crear Nuevo Perfil en ochotex_bd'}
                </h3>
              </div>
              <button
                onClick={() => setIsPerfilModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerfil} className="p-6 space-y-4 text-xs">
              {perfilError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                  {perfilError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código de Perfil *</label>
                  <input
                    type="text"
                    value={pCodigo}
                    onChange={(e) => setPCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej. AUDITORIA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-[#1a73e8]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre del Perfil *</label>
                  <input
                    type="text"
                    value={pNombre}
                    onChange={(e) => setPNombre(e.target.value)}
                    placeholder="Ej. Auditor de Inventario"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={pDescripcion}
                  onChange={(e) => setPDescripcion(e.target.value)}
                  placeholder="Descripción de responsabilidades del perfil..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Módulos y Acciones Permitidas:</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {ALL_PERMISOS.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pPermisos.includes(perm.id)}
                        onChange={() => togglePermiso(perm.id)}
                        className="w-4 h-4 text-[#1a73e8] rounded"
                      />
                      <span className="text-slate-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pActivo}
                  onChange={(e) => setPActivo(e.target.checked)}
                  className="w-4 h-4 text-[#1a73e8] rounded"
                />
                <span className="font-semibold text-slate-700">Perfil Activo</span>
              </label>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPerfilModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPerfil}
                  className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  {isSavingPerfil ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
