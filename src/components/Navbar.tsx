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
} from 'lucide-react';
import { UsuarioConPerfil } from '../types/inventory';

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
  supabaseConnected: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenIngreso,
  onOpenSalida,
  onOpenSqlModal,
  alertCount,
  pedidosPendientesCount,
  currentUser,
  supabaseConnected,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-200 text-slate-900 backdrop-blur-md shadow-2xs print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand + DB indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] border border-blue-200 flex items-center justify-center text-[#1a73e8] font-bold text-sm tracking-wider shadow-2xs">
              8T
            </div>
            <div>
              <button
                onClick={() => onTabChange('consulta_stock')}
                className="text-left font-bold tracking-tight text-slate-900 hover:text-[#1a73e8] transition-colors whitespace-nowrap text-sm block cursor-pointer"
              >
                Textiles Ocho Lukal
              </button>
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>{supabaseConnected ? 'En línea' : 'Modo local'}</span>
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation pills */}
          <nav className="hidden xl:flex items-center gap-1 text-sm">
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

            <button
              onClick={() => onTabChange('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS</span>
            </button>

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

            <button
              onClick={() => onTabChange('clientes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                activeTab === 'clientes'
                  ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Directorio de Clientes en ochotex_bd"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Clientes</span>
            </button>

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

            <button
              onClick={() => onTabChange('usuarios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap text-xs font-medium cursor-pointer ${
                activeTab === 'usuarios'
                  ? 'bg-[#e8f0fe] text-[#1967d2] font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Tabla perfiles y usuarios en ochotex_bd"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuarios & Perfiles</span>
            </button>
          </nav>

          {/* Zone 3: Quick Actions + Active User from ochotex_bd.usuarios */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={onOpenSalida}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all whitespace-nowrap cursor-pointer"
              title="Registrar Salida por Venta Directa, Merma o Muestra"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Salida</span>
              <span className="hidden sm:inline">(OUT)</span>
            </button>

            <button
              onClick={onOpenIngreso}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Ingresar</span>
              <span className="hidden sm:inline">(IN)</span>
            </button>

            {/* Chip de Usuario Conectado */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1 border-l border-slate-200">
              <div className="hidden md:block text-right">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.nombre_completo}
                </div>
                <div className="text-[10px] font-mono text-[#1a73e8] font-semibold flex items-center justify-end gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  <span>{currentUser.perfil?.codigo || 'USER'}</span>
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

      {/* Mobile / Tablet nav drawer */}
      <div className="xl:hidden border-t border-slate-200 px-3 py-2 flex items-center justify-start sm:justify-between text-xs overflow-x-auto gap-1.5 bg-slate-50/90 no-scrollbar">
        <button
          onClick={() => onTabChange('consulta_stock')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
            activeTab === 'consulta_stock' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs' : 'text-slate-600'
          }`}
        >
          Stock
        </button>
        <button
          onClick={() => onTabChange('stock')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'stock' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs' : 'text-slate-600'
          }`}
        >
          <span>Stock General</span>
          {alertCount > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 rounded-full font-mono font-bold">
              {alertCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onTabChange('pos')}
          className={`px-3 py-1 rounded-full whitespace-nowrap ${
            activeTab === 'pos' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold' : 'text-slate-600'
          }`}
        >
          POS
        </button>
        <button
          onClick={() => onTabChange('pedidos')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1 cursor-pointer ${
            activeTab === 'pedidos' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs' : 'text-slate-600'
          }`}
        >
          <span>Pedidos Pendientes</span>
          {pedidosPendientesCount > 0 && (
            <span className="font-mono text-[10px] bg-amber-500 text-white px-1.5 rounded-full font-bold">
              {pedidosPendientesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onTabChange('clientes')}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
            activeTab === 'clientes' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold shadow-2xs' : 'text-slate-600'
          }`}
        >
          Clientes
        </button>
        <button
          onClick={() => onTabChange('trazabilidad')}
          className={`px-3 py-1 rounded-full whitespace-nowrap ${
            activeTab === 'trazabilidad' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold' : 'text-slate-600'
          }`}
        >
          Trazabilidad
        </button>
        <button
          onClick={() => onTabChange('kardex')}
          className={`px-3 py-1 rounded-full whitespace-nowrap ${
            activeTab === 'kardex' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold' : 'text-slate-600'
          }`}
        >
          Kárdex
        </button>
        <button
          onClick={() => onTabChange('telas')}
          className={`px-3 py-1 rounded-full whitespace-nowrap ${
            activeTab === 'telas' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold' : 'text-slate-600'
          }`}
        >
          Catálogo
        </button>
        <button
          onClick={() => onTabChange('usuarios')}
          className={`px-3 py-1 rounded-full whitespace-nowrap ${
            activeTab === 'usuarios' ? 'bg-[#e8f0fe] text-[#1967d2] font-bold' : 'text-slate-600'
          }`}
        >
          Usuarios
        </button>
      </div>
    </header>
  );
};
