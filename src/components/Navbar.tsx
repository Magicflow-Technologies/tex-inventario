import React from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  FileText,
  Database,
  ShoppingCart,
  Clock,
  Users,
  Building2,
  LogOut,
  Shield,
  Eye,
} from 'lucide-react';
import { UsuarioConPerfil, Perfil } from '../types/inventory';
import { hasPermission } from '../utils/permissions';

export type ActiveTab =
  | 'stock'
  | 'consulta_stock'
  | 'pos'
  | 'pedidos'
  | 'clientes'
  | 'trazabilidad'
  | 'kardex'
  | 'telas'
  | 'usuarios';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenIngreso: () => void;
  onOpenSalida: () => void;
  onOpenSqlModal: () => void;
  alertCount: number;
  pedidosPendientesCount: number;
  currentUser: UsuarioConPerfil;
  perfiles?: Perfil[];
  simulatedPerfil?: Perfil | null;
  onChangeSimulatedPerfil?: (perfil: Perfil | null) => void;
  supabaseConnected: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenIngreso,
  onOpenSalida,
  alertCount,
  pedidosPendientesCount,
  currentUser,
  perfiles = [],
  simulatedPerfil = null,
  onChangeSimulatedPerfil,
  supabaseConnected,
  onLogout,
}) => {
  const isRealAdmin =
    (currentUser.perfil?.codigo || '').toUpperCase() === 'ADMIN' ||
    currentUser.usuario.toLowerCase() === 'admin';

  // Permisos dinámicos según el perfil del usuario (o el perfil simulado si el Admin está probando una vista)
  const canVerConsultaStock = hasPermission(currentUser, 'consulta_stock', simulatedPerfil);
  const canVerStockGeneral = hasPermission(currentUser, 'stock', simulatedPerfil);
  const canVerPos = hasPermission(currentUser, 'pos', simulatedPerfil);
  const canVerPedidos = hasPermission(currentUser, 'pedidos', simulatedPerfil);
  const canVerClientes = hasPermission(currentUser, 'clientes', simulatedPerfil);
  const canVerTrazabilidad = hasPermission(currentUser, 'trazabilidad', simulatedPerfil);
  const canVerKardex = hasPermission(currentUser, 'kardex', simulatedPerfil);
  const canVerCatalogo = hasPermission(currentUser, 'telas', simulatedPerfil);
  const canVerUsuarios = hasPermission(currentUser, 'usuarios', simulatedPerfil);

  const canRegistrarSalida = hasPermission(currentUser, 'salida', simulatedPerfil);
  const canRegistrarIngreso = hasPermission(currentUser, 'ingreso', simulatedPerfil);

  const activePerfilCodigo = simulatedPerfil?.codigo || currentUser.perfil?.codigo || 'USER';

  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-200 text-slate-900 backdrop-blur-md shadow-2xs print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand + DB indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onTabChange('consulta_stock')}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <img
                src="/logo-8tex.jpg"
                alt="8tex Perú"
                className="h-9 sm:h-10 w-auto object-contain rounded-lg border border-slate-200/80 bg-white px-1.5 py-0.5 shadow-2xs"
              />
              <div>
                <span className="font-bold tracking-tight text-slate-900 group-hover:text-[#1a73e8] transition-colors whitespace-nowrap text-sm block">
                  Textiles Ocho Lukal
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{supabaseConnected ? 'En línea' : 'Modo local'}</span>
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation pills (Filtrados dinámicamente según el Rol / Perfil) */}
          <nav className="hidden xl:flex items-center gap-1 text-sm">
            {canVerConsultaStock && (
              <button
                onClick={() => onTabChange('consulta_stock')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'consulta_stock'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Stock</span>
              </button>
            )}

            {canVerStockGeneral && (
              <button
                onClick={() => onTabChange('stock')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'stock'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Stock General</span>
                {alertCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 rounded-full font-mono font-semibold">
                    {alertCount}
                  </span>
                )}
              </button>
            )}

            {canVerPos && (
              <button
                onClick={() => onTabChange('pos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'pos'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Ventas</span>
              </button>
            )}

            {canVerPedidos && (
              <button
                onClick={() => onTabChange('pedidos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'pedidos'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pedidos Pendientes</span>
                {pedidosPendientesCount > 0 && (
                  <span className="text-[10px] font-mono font-bold bg-amber-500 text-white px-1.5 rounded-full">
                    {pedidosPendientesCount}
                  </span>
                )}
              </button>
            )}

            {canVerClientes && (
              <button
                onClick={() => onTabChange('clientes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'clientes'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Clientes</span>
              </button>
            )}

            {canVerTrazabilidad && (
              <button
                onClick={() => onTabChange('trazabilidad')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'trazabilidad'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Trazabilidad</span>
              </button>
            )}

            {canVerKardex && (
              <button
                onClick={() => onTabChange('kardex')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'kardex'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Kárdex</span>
              </button>
            )}

            {canVerCatalogo && (
              <button
                onClick={() => onTabChange('telas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'telas'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Catálogo</span>
              </button>
            )}

            {canVerUsuarios && (
              <button
                onClick={() => onTabChange('usuarios')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Usuarios & Perfiles</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Quick Actions + Role Preview (Admin) + Active User */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {canRegistrarSalida && (
              <button
                onClick={onOpenSalida}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all whitespace-nowrap cursor-pointer"
                title="Registrar Salida por Venta Directa, Merma o Muestra"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Salida</span>
                <span className="hidden sm:inline">(OUT)</span>
              </button>
            )}

            {canRegistrarIngreso && (
              <button
                onClick={onOpenIngreso}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Ingresar</span>
                <span className="hidden sm:inline">(IN)</span>
              </button>
            )}

            {/* Selector Rápido de Vista de Rol (Solo para Administradores para probar vistas de otros perfiles) */}
            {isRealAdmin && onChangeSimulatedPerfil && perfiles.length > 0 && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition ${
                  simulatedPerfil
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title="Simular vista del sistema como otro rol de usuario"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden lg:inline">
                  Ver como:
                </span>
                <select
                  value={simulatedPerfil?.id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      onChangeSimulatedPerfil(null);
                    } else {
                      const found = perfiles.find((p) => p.id === id) || null;
                      onChangeSimulatedPerfil(found);
                    }
                  }}
                  className="bg-transparent font-mono font-bold text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="">ADMIN (Todo)</option>
                  {perfiles
                    .filter((p) => p.codigo.toUpperCase() !== 'ADMIN')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} ({p.nombre})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Chip de Usuario Conectado */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1 border-l border-slate-200">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.nombre_completo}
                </div>
                <div className="text-[10px] font-mono text-[#1a73e8] font-semibold flex items-center justify-end gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  <span>{activePerfilCodigo}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet nav drawer (Filtrado dinámicamente según el Rol / Perfil) */}
      <div className="xl:hidden border-t border-slate-200 px-3 py-2 flex items-center justify-start sm:justify-between text-xs overflow-x-auto gap-1.5 bg-slate-50/90 no-scrollbar">
        {canVerConsultaStock && (
          <button
            onClick={() => onTabChange('consulta_stock')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              activeTab === 'consulta_stock'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Stock
          </button>
        )}

        {canVerStockGeneral && (
          <button
            onClick={() => onTabChange('stock')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            <span>Stock General</span>
            {alertCount > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 rounded-full font-mono font-bold">
                {alertCount}
              </span>
            )}
          </button>
        )}

        {canVerPos && (
          <button
            onClick={() => onTabChange('pos')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Ventas
          </button>
        )}

        {canVerPedidos && (
          <button
            onClick={() => onTabChange('pedidos')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              activeTab === 'pedidos'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            <span>Pedidos Pendientes</span>
            {pedidosPendientesCount > 0 && (
              <span className="font-mono text-[10px] bg-amber-500 text-white px-1.5 rounded-full font-bold">
                {pedidosPendientesCount}
              </span>
            )}
          </button>
        )}

        {canVerClientes && (
          <button
            onClick={() => onTabChange('clientes')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              activeTab === 'clientes'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Clientes
          </button>
        )}

        {canVerTrazabilidad && (
          <button
            onClick={() => onTabChange('trazabilidad')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              activeTab === 'trazabilidad'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Trazabilidad
          </button>
        )}

        {canVerKardex && (
          <button
            onClick={() => onTabChange('kardex')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              activeTab === 'kardex'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Kárdex
          </button>
        )}

        {canVerCatalogo && (
          <button
            onClick={() => onTabChange('telas')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              activeTab === 'telas'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Catálogo
          </button>
        )}

        {canVerUsuarios && (
          <button
            onClick={() => onTabChange('usuarios')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
              activeTab === 'usuarios'
                ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Usuarios
          </button>
        )}
      </div>
    </header>
  );
};
