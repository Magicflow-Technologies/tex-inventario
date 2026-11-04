import React, { useState, useEffect } from 'react';
import { inventoryStore } from './services/inventoryStore';
import { RolloConTela } from './types/inventory';
import { Navbar, ActiveTab } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { StockConsolidadoView } from './components/StockConsolidadoView';
import { ConsultaStockMovilView } from './components/ConsultaStockMovilView';
import { PuntoVentaView } from './components/PuntoVentaView';
import { PedidosPorFacturarView } from './components/PedidosPorFacturarView';
import { IngresoMercaderiaModal } from './components/IngresoMercaderiaModal';
import { SalidaMercaderiaModal } from './components/SalidaMercaderiaModal';
import { TrazabilidadRolloView } from './components/TrazabilidadRolloView';
import { KardexMovimientosView } from './components/KardexMovimientosView';
import { CatalogoTelasModal } from './components/CatalogoTelasModal';
import { UsuariosPerfilesView } from './components/UsuariosPerfilesView';
import { EtiquetaRolloModal } from './components/EtiquetaRolloModal';
import { MigracionSqlModal } from './components/MigracionSqlModal';
import { CheckCircle2, X } from 'lucide-react';

export default function App() {
  // Suscripción reactiva al Store conectado a Supabase (ochotex_bd)
  const [, setTick] = useState(0);
  useEffect(() => {
    return inventoryStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const currentUser = inventoryStore.getCurrentUser();
  const connStatus = inventoryStore.getConnectionStatus();

  const stockList = inventoryStore.getStockConsolidado();
  const telas = inventoryStore.getTelas();
  const movimientos = inventoryStore.getMovimientosCompletos();
  const pedidos = inventoryStore.getPedidosCompletos();
  const pedidosPendientes = inventoryStore.getPedidosPendientes();
  const usuarios = inventoryStore.getUsuariosConPerfil();
  const perfiles = inventoryStore.getPerfiles();

  // Estados de navegación y modales
  const [activeTab, setActiveTab] = useState<ActiveTab>('stock');
  const [isIngresoOpen, setIsIngresoOpen] = useState(false);
  const [isSalidaOpen, setIsSalidaOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  const [initialTelaIdIngreso, setInitialTelaIdIngreso] = useState<string | undefined>();
  const [initialTelaIdSalida, setInitialTelaIdSalida] = useState<string | undefined>();
  const [initialTelaIdPos, setInitialTelaIdPos] = useState<string | undefined>();

  const [trazabilidadCodigo, setTrazabilidadCodigo] = useState<string>('ROL-2026-00001');
  const [rolloParaEtiqueta, setRolloParaEtiqueta] = useState<RolloConTela | null>(null);

  // Mensaje de éxito / Toast
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const showToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Si no hay sesión iniciada, mostrar validación contra ochotex_bd.usuarios y ochotex_bd.perfiles
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(u) => {
          showToast(
            `Bienvenido, ${u.nombre_completo}`,
            `Sesión autenticada con perfil ${u.perfil.nombre} (${u.perfil.codigo}) en ochotex_bd.`
          );
        }}
      />
    );
  }

  const defaultResponsable = `${currentUser.nombre_completo} (${currentUser.perfil?.nombre || currentUser.cargo || '8tex'})`;

  const handleOpenIngresoConTela = (telaId: string) => {
    setInitialTelaIdIngreso(telaId);
    setIsIngresoOpen(true);
  };

  const handleOpenSalidaConTela = (telaId: string) => {
    setInitialTelaIdSalida(telaId);
    setIsSalidaOpen(true);
  };

  const handleArmarPedidoConTela = (telaId: string) => {
    setInitialTelaIdPos(telaId);
    setActiveTab('pos');
  };

  const handleVerTrazabilidad = (codigoRollo: string) => {
    setTrazabilidadCodigo(codigoRollo);
    setActiveTab('trazabilidad');
  };

  const handleVerEtiqueta = (rollo: RolloConTela) => {
    setRolloParaEtiqueta(rollo);
  };

  const alertCount = stockList.filter((s) => s.alerta_reposicion).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== 'pos') setInitialTelaIdPos(undefined);
          setActiveTab(tab);
        }}
        onOpenIngreso={() => {
          setInitialTelaIdIngreso(undefined);
          setIsIngresoOpen(true);
        }}
        onOpenSalida={() => {
          setInitialTelaIdSalida(undefined);
          setIsSalidaOpen(true);
        }}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        alertCount={alertCount}
        pedidosPendientesCount={pedidosPendientes.length}
        currentUser={currentUser}
        supabaseConnected={connStatus.connected}
        onLogout={() => inventoryStore.logout()}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 p-4 rounded-2xl shadow-xl flex items-start gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-200 ring-1 ring-slate-100 print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-900 text-sm">{toastMessage.title}</div>
            <div className="text-slate-600 mt-0.5">{toastMessage.description}</div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'stock' && (
          <StockConsolidadoView
            stockList={stockList}
            onOpenIngresoConTela={handleOpenIngresoConTela}
            onOpenSalidaConTela={handleOpenSalidaConTela}
            onArmarPedidoConTela={handleArmarPedidoConTela}
            onVerTrazabilidadRollo={handleVerTrazabilidad}
            onVerEtiqueta={handleVerEtiqueta}
          />
        )}

        {activeTab === 'consulta_stock' && (
          <ConsultaStockMovilView
            stockList={stockList}
            defaultRegistradoPor={defaultResponsable}
            onPedidoCreado={(pedido) => {
              showToast(
                `Orden ${pedido.codigo_pedido} Creada en Supabase`,
                `Se reservaron ${pedido.total_rollos} rollos físicos para ${pedido.cliente_nombre}.`
              );
            }}
            onIrAPedidosPendientes={() => setActiveTab('pedidos')}
          />
        )}

        {activeTab === 'pos' && (
          <PuntoVentaView
            telas={telas}
            initialTelaId={initialTelaIdPos}
            defaultRegistradoPor={defaultResponsable}
            onPedidoCreado={(pedido) => {
              showToast(
                `Orden ${pedido.codigo_pedido} Creada en Supabase`,
                `Se reservaron ${pedido.total_rollos} rollos físicos para ${pedido.cliente_nombre}.`
              );
            }}
            onIrAPedidosPendientes={() => setActiveTab('pedidos')}
          />
        )}

        {activeTab === 'pedidos' && (
          <PedidosPorFacturarView
            pedidos={pedidos}
            defaultRegistradoPor={defaultResponsable}
            onFacturacionExitosa={(pedido) => {
              showToast(
                `Pedido ${pedido.codigo_pedido} Facturado y Despachado`,
                `Se registró la Factura ${pedido.numero_factura} y la Guía ${pedido.numero_guia || 'N/A'} en ochotex_bd.`
              );
            }}
            onIrAPuntoVenta={() => setActiveTab('pos')}
          />
        )}

        {activeTab === 'trazabilidad' && (
          <TrazabilidadRolloView
            initialCodigoRollo={trazabilidadCodigo}
            onVerEtiqueta={handleVerEtiqueta}
            onOpenSalidaConRollo={() => setIsSalidaOpen(true)}
          />
        )}

        {activeTab === 'kardex' && (
          <KardexMovimientosView
            movimientos={movimientos}
            onVerTrazabilidadRollo={handleVerTrazabilidad}
          />
        )}

        {activeTab === 'telas' && (
          <CatalogoTelasModal
            telas={telas}
            onOpenIngresoConTela={handleOpenIngresoConTela}
          />
        )}

        {activeTab === 'usuarios' && (
          <UsuariosPerfilesView
            usuarios={usuarios}
            perfiles={perfiles}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Modales de Operación */}
      <IngresoMercaderiaModal
        isOpen={isIngresoOpen}
        onClose={() => setIsIngresoOpen(false)}
        telas={telas}
        initialTelaId={initialTelaIdIngreso}
        defaultRegistradoPor={defaultResponsable}
        onSuccess={(_, count) => {
          showToast(
            'Ingreso Registrado con Éxito (IN)',
            `Se crearon ${count} nuevos rollos físicos disponibles en ochotex_bd.rollos.`
          );
        }}
      />

      <SalidaMercaderiaModal
        isOpen={isSalidaOpen}
        onClose={() => setIsSalidaOpen(false)}
        telas={telas}
        initialTelaId={initialTelaIdSalida}
        defaultRegistradoPor={defaultResponsable}
        onSuccess={(_, count) => {
          showToast(
            'Despacho Registrado con Éxito (OUT)',
            `Se actualizaron ${count} rollos físicos en ochotex_bd.rollos.`
          );
        }}
      />

      <EtiquetaRolloModal
        rollo={rolloParaEtiqueta}
        onClose={() => setRolloParaEtiqueta(null)}
      />

      <MigracionSqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        onDataReset={() => {
          showToast('Datos Sincronizados', 'Se recargaron los datos del almacén de 8tex.');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900">Textiles Ocho Lukal E.I.R.L.</span>
            <span>·</span>
            <span className="text-slate-600">Punto de Venta (POS) & Control Físico Rollo a Rollo</span>
            <span>·</span>
            <span className="font-mono text-[#1a73e8] font-semibold">
              Supabase (ochotex_bd) {connStatus.connected ? 'Conectado' : 'Modo Local'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button
              onClick={() => setActiveTab('usuarios')}
              className="hover:text-[#1a73e8] transition-colors cursor-pointer font-medium"
            >
              Usuarios y Perfiles ({usuarios.length})
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('pedidos')}
              className="hover:text-[#1a73e8] transition-colors cursor-pointer font-medium"
            >
              Pedidos Pendientes ({pedidosPendientes.length})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
