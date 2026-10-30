import {
  Tela,
  Rollo,
  MovimientoInventario,
  MovimientoDetalle,
  StockConsolidadoTela,
  RolloConTela,
  MovimientoCompleto,
  EstadoRollo,
  Pedido,
  PedidoDetalle,
  PedidoCompleto,
  Perfil,
  Usuario,
  UsuarioConPerfil,
} from '../types/inventory';
import {
  SEED_PERFILES,
  SEED_USUARIOS,
  SEED_TELAS,
  SEED_ROLLOS,
  SEED_MOVIMIENTOS,
  SEED_MOVIMIENTO_DETALLES,
  SEED_PEDIDOS,
  SEED_PEDIDO_DETALLES,
} from '../data/seedData';
import { generateUUID, generateCodigoRollo } from '../utils/uuid';
import { supabaseRest } from './supabaseClient';

const STORAGE_KEYS = {
  PERFILES: '8tex_inv_perfiles_v2',
  USUARIOS: '8tex_inv_usuarios_v2',
  TELAS: '8tex_inv_telas_v2',
  ROLLOS: '8tex_inv_rollos_v2',
  MOVIMIENTOS: '8tex_inv_movimientos_v2',
  DETALLES: '8tex_inv_detalles_v2',
  PEDIDOS: '8tex_inv_pedidos_v2',
  PEDIDO_DETALLES: '8tex_inv_pedido_detalles_v2',
  SESSION: '8tex_auth_session_v2',
};

class InventoryStore {
  private perfiles: Perfil[] = [];
  private usuarios: Usuario[] = [];
  private telas: Tela[] = [];
  private rollos: Rollo[] = [];
  private movimientos: MovimientoInventario[] = [];
  private detalles: MovimientoDetalle[] = [];
  private pedidos: Pedido[] = [];
  private pedidoDetalles: PedidoDetalle[] = [];
  private currentUser: UsuarioConPerfil | null = null;
  private supabaseConnected = false;
  private isSyncing = false;
  private lastSyncError: string | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedPerfiles = localStorage.getItem(STORAGE_KEYS.PERFILES);
      const storedUsuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      const storedTelas = localStorage.getItem(STORAGE_KEYS.TELAS);
      const storedRollos = localStorage.getItem(STORAGE_KEYS.ROLLOS);
      const storedMovs = localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS);
      const storedDet = localStorage.getItem(STORAGE_KEYS.DETALLES);
      const storedPed = localStorage.getItem(STORAGE_KEYS.PEDIDOS);
      const storedPedDet = localStorage.getItem(STORAGE_KEYS.PEDIDO_DETALLES);
      const storedSession = localStorage.getItem(STORAGE_KEYS.SESSION);

      if (storedSession) {
        this.currentUser = JSON.parse(storedSession);
      }

      if (storedTelas && storedRollos && storedMovs && storedDet && storedPed && storedPedDet) {
        this.perfiles = storedPerfiles ? JSON.parse(storedPerfiles) : JSON.parse(JSON.stringify(SEED_PERFILES));
        this.usuarios = storedUsuarios ? JSON.parse(storedUsuarios) : JSON.parse(JSON.stringify(SEED_USUARIOS));
        this.telas = JSON.parse(storedTelas);
        this.rollos = JSON.parse(storedRollos);
        this.movimientos = JSON.parse(storedMovs);
        this.detalles = JSON.parse(storedDet);
        this.pedidos = JSON.parse(storedPed);
        this.pedidoDetalles = JSON.parse(storedPedDet);
      } else {
        this.resetToDefaults(false);
      }
    } catch {
      this.resetToDefaults(false);
    }

    // Sincronizar con Supabase (esquema ochotex_bd) al iniciar
    this.syncFromSupabase();
  }

  public async syncFromSupabase(): Promise<boolean> {
    this.isSyncing = true;
    this.notify();
    try {
      const [
        perfiles,
        usuarios,
        telas,
        rollos,
        movimientos,
        detalles,
        pedidos,
        pedidoDetalles,
      ] = await Promise.all([
        supabaseRest.select<Perfil>('perfiles', 'select=*&order=created_at.asc'),
        supabaseRest.select<Usuario>('usuarios', 'select=*&order=created_at.asc'),
        supabaseRest.select<Tela>('telas', 'select=*&order=nombre.asc'),
        supabaseRest.select<Rollo>('rollos', 'select=*&order=fecha_ingreso.asc'),
        supabaseRest.select<MovimientoInventario>('movimientos_inventario', 'select=*&order=created_at.desc'),
        supabaseRest.select<MovimientoDetalle>('movimiento_detalles', 'select=*'),
        supabaseRest.select<Pedido>('pedidos', 'select=*&order=created_at.desc'),
        supabaseRest.select<PedidoDetalle>('pedido_detalles', 'select=*'),
      ]);

      this.perfiles = perfiles.map((p) => ({
        ...p,
        permisos: Array.isArray(p.permisos) ? p.permisos : [],
      }));
      this.usuarios = usuarios;
      this.telas = telas.map((t) => ({
        ...t,
        ancho: Number(t.ancho) || 1.5,
        metraje_estandar: Number(t.metraje_estandar) || 50,
        stock_minimo_alerta: Number(t.stock_minimo_alerta) || 0,
      }));
      this.rollos = rollos.map((r) => ({
        ...r,
        metraje: Number(r.metraje),
      }));
      this.movimientos = movimientos;
      this.detalles = detalles.map((d) => ({
        ...d,
        metraje_movimiento: Number(d.metraje_movimiento),
      }));
      this.pedidos = pedidos.map((p) => ({
        ...p,
        total_rollos: Number(p.total_rollos),
        total_metros: Number(p.total_metros),
        total_importe: Number(p.total_importe),
      }));
      this.pedidoDetalles = pedidoDetalles.map((pd) => ({
        ...pd,
        metraje: Number(pd.metraje),
        precio_metro: Number(pd.precio_metro),
        subtotal: Number(pd.subtotal),
      }));

      // Refrescar sesión activa si existe
      if (this.currentUser) {
        const updatedUser = this.usuarios.find((u) => u.id === this.currentUser?.id);
        if (updatedUser && updatedUser.activo) {
          const perfil = this.perfiles.find((p) => p.id === updatedUser.perfil_id);
          if (perfil) {
            this.currentUser = { ...updatedUser, perfil };
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(this.currentUser));
          }
        }
      }

      this.supabaseConnected = true;
      this.lastSyncError = null;
      this.isSyncing = false;
      this.persist();
      return true;
    } catch (err) {
      this.supabaseConnected = false;
      this.isSyncing = false;
      this.lastSyncError = err instanceof Error ? err.message : 'Error de conexión a Supabase';
      console.warn('Operando con caché local:', this.lastSyncError);
      this.notify();
      return false;
    }
  }

  public getConnectionStatus() {
    return {
      connected: this.supabaseConnected,
      syncing: this.isSyncing,
      error: this.lastSyncError,
    };
  }

  // ==========================================
  // AUTENTICACIÓN Y VALIDACIÓN DESDE ochotex_bd.usuarios y ochotex_bd.perfiles
  // ==========================================
  public getCurrentUser(): UsuarioConPerfil | null {
    return this.currentUser;
  }

  public async login(usuarioInput: string, passwordInput: string): Promise<UsuarioConPerfil> {
    const cleanUser = usuarioInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      throw new Error('Ingrese su usuario y contraseña.');
    }

    // 1. Consultar directamente en Supabase ochotex_bd.usuarios con JOIN a ochotex_bd.perfiles
    try {
      const rows = await supabaseRest.select<Usuario & { perfil: Perfil }>(
        'usuarios',
        `select=*,perfil:perfiles(*)&or=(usuario.ilike.${encodeURIComponent(cleanUser)},correo.ilike.${encodeURIComponent(cleanUser)})`
      );

      const matched = rows.find(
        (u) =>
          (u.usuario.toLowerCase() === cleanUser || (u.correo && u.correo.toLowerCase() === cleanUser)) &&
          u.password === cleanPass
      );

      if (!matched) {
        throw new Error('Credenciales inválidas. Verifique su usuario y contraseña en ochotex_bd.usuarios.');
      }

      if (!matched.activo) {
        throw new Error(`La cuenta del usuario "${matched.usuario}" se encuentra desactivada.`);
      }

      if (!matched.perfil || !matched.perfil.activo) {
        throw new Error('El perfil asignado a este usuario no está activo.');
      }

      const now = new Date().toISOString();
      await supabaseRest.update('usuarios', `id=eq.${matched.id}`, {
        ultimo_acceso: now,
        updated_at: now,
      });

      const userConPerfil: UsuarioConPerfil = {
        ...matched,
        ultimo_acceso: now,
        perfil: {
          ...matched.perfil,
          permisos: Array.isArray(matched.perfil.permisos) ? matched.perfil.permisos : [],
        },
      };

      this.currentUser = userConPerfil;
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(userConPerfil));
      await this.syncFromSupabase();
      return userConPerfil;
    } catch (err) {
      if (err instanceof Error && (err.message.includes('Credenciales') || err.message.includes('desactivada') || err.message.includes('perfil'))) {
        throw err;
      }
      // Fallback local si hay corte momentáneo de red
      const localUser = this.usuarios.find(
        (u) =>
          (u.usuario.toLowerCase() === cleanUser || (u.correo && u.correo.toLowerCase() === cleanUser)) &&
          u.password === cleanPass
      );
      if (!localUser) {
        throw new Error('Credenciales inválidas. Verifique su usuario y contraseña.');
      }
      if (!localUser.activo) {
        throw new Error(`El usuario "${localUser.usuario}" está inactivo.`);
      }
      const perfil = this.perfiles.find((p) => p.id === localUser.perfil_id) || SEED_PERFILES[0];
      const userConPerfil: UsuarioConPerfil = {
        ...localUser,
        ultimo_acceso: new Date().toISOString(),
        perfil,
      };
      this.currentUser = userConPerfil;
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(userConPerfil));
      this.notify();
      return userConPerfil;
    }
  }

  public logout() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    this.notify();
  }

  public getPerfiles(): Perfil[] {
    return [...this.perfiles];
  }

  public getUsuariosConPerfil(): UsuarioConPerfil[] {
    const perfilMap = new Map<string, Perfil>();
    this.perfiles.forEach((p) => perfilMap.set(p.id, p));
    return this.usuarios.map((u) => ({
      ...u,
      perfil: perfilMap.get(u.perfil_id) || SEED_PERFILES[0],
    }));
  }

  public async savePerfil(data: Partial<Perfil> & { codigo: string; nombre: string }): Promise<Perfil> {
    const now = new Date().toISOString();
    if (data.id) {
      const idx = this.perfiles.findIndex((p) => p.id === data.id);
      if (idx === -1) throw new Error('Perfil no encontrado');
      const updated: Perfil = {
        ...this.perfiles[idx],
        codigo: data.codigo.trim().toUpperCase(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() ?? this.perfiles[idx].descripcion,
        permisos: data.permisos ?? this.perfiles[idx].permisos,
        activo: data.activo ?? this.perfiles[idx].activo,
        updated_at: now,
      };
      await supabaseRest.update('perfiles', `id=eq.${updated.id}`, {
        codigo: updated.codigo,
        nombre: updated.nombre,
        descripcion: updated.descripcion,
        permisos: updated.permisos,
        activo: updated.activo,
        updated_at: now,
      });
      this.perfiles[idx] = updated;
      this.persist();
      return updated;
    } else {
      const existe = this.perfiles.some(
        (p) => p.codigo.toUpperCase() === data.codigo.trim().toUpperCase()
      );
      if (existe) throw new Error(`El código de perfil ${data.codigo} ya existe.`);
      const nuevo: Perfil = {
        id: generateUUID(),
        codigo: data.codigo.trim().toUpperCase(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || '',
        permisos: data.permisos || ['stock', 'trazabilidad'],
        activo: data.activo ?? true,
        created_at: now,
        updated_at: now,
      };
      await supabaseRest.insert('perfiles', nuevo);
      this.perfiles.push(nuevo);
      this.persist();
      return nuevo;
    }
  }

  public async saveUsuario(
    data: Partial<Usuario> & { usuario: string; nombre_completo: string; perfil_id: string }
  ): Promise<Usuario> {
    const now = new Date().toISOString();
    if (data.id) {
      const idx = this.usuarios.findIndex((u) => u.id === data.id);
      if (idx === -1) throw new Error('Usuario no encontrado');
      const updated: Usuario = {
        ...this.usuarios[idx],
        perfil_id: data.perfil_id,
        usuario: data.usuario.trim().toLowerCase(),
        password: data.password?.trim() ? data.password.trim() : this.usuarios[idx].password,
        nombre_completo: data.nombre_completo.trim(),
        correo: data.correo?.trim() ?? this.usuarios[idx].correo,
        telefono: data.telefono?.trim() ?? this.usuarios[idx].telefono,
        cargo: data.cargo?.trim() ?? this.usuarios[idx].cargo,
        activo: data.activo ?? this.usuarios[idx].activo,
        updated_at: now,
      };
      await supabaseRest.update('usuarios', `id=eq.${updated.id}`, {
        perfil_id: updated.perfil_id,
        usuario: updated.usuario,
        password: updated.password,
        nombre_completo: updated.nombre_completo,
        correo: updated.correo,
        telefono: updated.telefono,
        cargo: updated.cargo,
        activo: updated.activo,
        updated_at: now,
      });
      this.usuarios[idx] = updated;
      this.persist();
      return updated;
    } else {
      const cleanUsername = data.usuario.trim().toLowerCase();
      const existe = this.usuarios.some((u) => u.usuario.toLowerCase() === cleanUsername);
      if (existe) throw new Error(`El nombre de usuario "${cleanUsername}" ya está registrado.`);
      if (!data.password?.trim()) throw new Error('Debe asignar una contraseña al nuevo usuario.');

      const nuevo: Usuario = {
        id: generateUUID(),
        perfil_id: data.perfil_id,
        usuario: cleanUsername,
        password: data.password.trim(),
        nombre_completo: data.nombre_completo.trim(),
        correo: data.correo?.trim() || '',
        telefono: data.telefono?.trim() || '',
        cargo: data.cargo?.trim() || '',
        activo: data.activo ?? true,
        ultimo_acceso: null,
        created_at: now,
        updated_at: now,
      };
      await supabaseRest.insert('usuarios', nuevo);
      this.usuarios.push(nuevo);
      this.persist();
      return nuevo;
    }
  }

  public async deleteUsuario(usuarioId: string): Promise<void> {
    if (this.currentUser?.id === usuarioId) {
      throw new Error('No puedes eliminar el usuario con el que tienes sesión activa.');
    }
    const idx = this.usuarios.findIndex((u) => u.id === usuarioId);
    if (idx === -1) throw new Error('Usuario no encontrado');

    await supabaseRest.remove('usuarios', `id=eq.${usuarioId}`);
    this.usuarios.splice(idx, 1);
    this.persist();
  }

  public async deletePerfil(perfilId: string): Promise<void> {
    const enUso = this.usuarios.some((u) => u.perfil_id === perfilId);
    if (enUso) {
      throw new Error(
        'No se puede eliminar este perfil porque tiene usuarios asignados. Reasigna o elimina primero esos usuarios.'
      );
    }
    const idx = this.perfiles.findIndex((p) => p.id === perfilId);
    if (idx === -1) throw new Error('Perfil no encontrado');

    await supabaseRest.remove('perfiles', `id=eq.${perfilId}`);
    this.perfiles.splice(idx, 1);
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.PERFILES, JSON.stringify(this.perfiles));
      localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(this.usuarios));
      localStorage.setItem(STORAGE_KEYS.TELAS, JSON.stringify(this.telas));
      localStorage.setItem(STORAGE_KEYS.ROLLOS, JSON.stringify(this.rollos));
      localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(this.movimientos));
      localStorage.setItem(STORAGE_KEYS.DETALLES, JSON.stringify(this.detalles));
      localStorage.setItem(STORAGE_KEYS.PEDIDOS, JSON.stringify(this.pedidos));
      localStorage.setItem(STORAGE_KEYS.PEDIDO_DETALLES, JSON.stringify(this.pedidoDetalles));
    } catch (e) {
      console.error('Error al persistir en localStorage:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public resetToDefaults(shouldNotify = true) {
    this.perfiles = JSON.parse(JSON.stringify(SEED_PERFILES));
    this.usuarios = JSON.parse(JSON.stringify(SEED_USUARIOS));
    this.telas = JSON.parse(JSON.stringify(SEED_TELAS));
    this.rollos = JSON.parse(JSON.stringify(SEED_ROLLOS));
    this.movimientos = JSON.parse(JSON.stringify(SEED_MOVIMIENTOS));
    this.detalles = JSON.parse(JSON.stringify(SEED_MOVIMIENTO_DETALLES));
    this.pedidos = JSON.parse(JSON.stringify(SEED_PEDIDOS));
    this.pedidoDetalles = JSON.parse(JSON.stringify(SEED_PEDIDO_DETALLES));

    if (shouldNotify) {
      this.persist();
    } else {
      localStorage.setItem(STORAGE_KEYS.PERFILES, JSON.stringify(this.perfiles));
      localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(this.usuarios));
      localStorage.setItem(STORAGE_KEYS.TELAS, JSON.stringify(this.telas));
      localStorage.setItem(STORAGE_KEYS.ROLLOS, JSON.stringify(this.rollos));
      localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(this.movimientos));
      localStorage.setItem(STORAGE_KEYS.DETALLES, JSON.stringify(this.detalles));
      localStorage.setItem(STORAGE_KEYS.PEDIDOS, JSON.stringify(this.pedidos));
      localStorage.setItem(STORAGE_KEYS.PEDIDO_DETALLES, JSON.stringify(this.pedidoDetalles));
    }
  }

  // ==========================================
  // CONSULTA 1: Stock Consolidado por Tela
  // ==========================================
  public getStockConsolidado(): StockConsolidadoTela[] {
    return this.telas
      .filter((t) => t.activo)
      .map((tela) => {
        const rollosDisponibles = this.rollos.filter(
          (r) => r.tela_id === tela.id && r.estado === 'DISPONIBLE'
        );

        const rollosReservados = this.rollos.filter(
          (r) => r.tela_id === tela.id && r.estado === 'RESERVADO'
        );

        const totalRollos = rollosDisponibles.length;
        const totalMetros = Number(
          rollosDisponibles.reduce((acc, r) => acc + Number(r.metraje), 0).toFixed(2)
        );

        const totalRollosRes = rollosReservados.length;
        const totalMetrosRes = Number(
          rollosReservados.reduce((acc, r) => acc + Number(r.metraje), 0).toFixed(2)
        );

        const alerta = totalMetros <= tela.stock_minimo_alerta;

        return {
          tela_id: tela.id,
          codigo: tela.codigo,
          nombre: tela.nombre,
          codigo_color: tela.codigo_color || '000',
          color: tela.color,
          linea: tela.linea || 'General',
          ancho: Number(tela.ancho) || 1.5,
          unidad_medida: tela.unidad_medida,
          total_rollos_disponibles: totalRollos,
          total_metros_disponibles: totalMetros,
          total_rollos_reservados: totalRollosRes,
          total_metros_reservados: totalMetrosRes,
          stock_minimo_alerta: Number(tela.stock_minimo_alerta),
          alerta_reposicion: alerta,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // ==========================================
  // CONSULTA 2: Búsqueda puntual y trazabilidad de un rollo
  // ==========================================
  public getRolloTrazabilidad(codigoBuscado: string): {
    rollo: RolloConTela | null;
    movimientoIngreso: MovimientoInventario | null;
    movimientoSalida: MovimientoInventario | null;
    pedidoAsociado: Pedido | null;
  } {
    const cleanCode = codigoBuscado.trim().toUpperCase();
    const rollo = this.rollos.find(
      (r) => r.codigo_rollo.toUpperCase() === cleanCode || r.id === codigoBuscado
    );

    if (!rollo) {
      return { rollo: null, movimientoIngreso: null, movimientoSalida: null, pedidoAsociado: null };
    }

    const tela = this.telas.find((t) => t.id === rollo.tela_id);
    const rolloConTela: RolloConTela = {
      ...rollo,
      tela_nombre: tela ? tela.nombre : 'Desconocida',
      tela_codigo: tela ? tela.codigo : 'N/A',
      tela_codigo_color: tela ? tela.codigo_color || '' : '',
      tela_color: tela ? tela.color : 'N/A',
      tela_linea: tela ? tela.linea || '' : '',
      tela_ancho: tela ? Number(tela.ancho) || 1.5 : 1.5,
      unidad_medida: tela ? tela.unidad_medida : 'METROS',
    };

    const detallesRollo = this.detalles.filter((d) => d.rollo_id === rollo.id);
    let movIngreso: MovimientoInventario | null = null;
    let movSalida: MovimientoInventario | null = null;

    detallesRollo.forEach((d) => {
      const mov = this.movimientos.find((m) => m.id === d.movimiento_id);
      if (mov) {
        if (mov.tipo_movimiento === 'IN' && !movIngreso) {
          movIngreso = mov;
        } else if (mov.tipo_movimiento === 'OUT' && !movSalida) {
          movSalida = mov;
        }
      }
    });

    let pedidoAsociado: Pedido | null = null;
    const pedDet = this.pedidoDetalles.find((pd) => pd.rollo_id === rollo.id);
    if (pedDet) {
      pedidoAsociado = this.pedidos.find((p) => p.id === pedDet.pedido_id) || null;
    }

    return {
      rollo: rolloConTela,
      movimientoIngreso: movIngreso,
      movimientoSalida: movSalida,
      pedidoAsociado,
    };
  }

  // ==========================================
  // CONSULTA 3: Picking FIFO de rollos disponibles
  // ==========================================
  public getRollosDisponiblesFIFO(telaId: string): RolloConTela[] {
    const tela = this.telas.find((t) => t.id === telaId);
    return this.rollos
      .filter((r) => r.tela_id === telaId && r.estado === 'DISPONIBLE')
      .sort((a, b) => new Date(a.fecha_ingreso).getTime() - new Date(b.fecha_ingreso).getTime())
      .map((r) => ({
        ...r,
        tela_nombre: tela ? tela.nombre : '',
        tela_codigo: tela ? tela.codigo : '',
        tela_codigo_color: tela ? tela.codigo_color || '' : '',
        tela_color: tela ? tela.color : '',
        tela_linea: tela ? tela.linea || '' : '',
        tela_ancho: tela ? Number(tela.ancho) || 1.5 : 1.5,
        unidad_medida: tela ? tela.unidad_medida : 'METROS',
      }));
  }

  public getNextRolloSequence(): number {
    let maxSeq = this.rollos.length;
    this.rollos.forEach((r) => {
      const m = r.codigo_rollo.match(/(\d+)$/);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val > maxSeq) maxSeq = val;
      }
    });
    return maxSeq;
  }

  // ==========================================
  // FLUJO A: Ingreso de Mercadería (IN)
  // ==========================================
  public registrarIngreso(data: {
    motivo: 'COMPRA_LOCAL' | 'IMPORTACION' | 'AJUSTE_INICIAL';
    documento_referencia: string;
    entidad_origen_destino: string;
    observaciones: string;
    registrado_por: string;
    rollos: Array<{
      tela_id: string;
      metraje: number;
      lote: string;
      ubicacion: string;
      codigo_rollo?: string;
    }>;
  }): { movimientoId: string; rollosCreados: Rollo[] } {
    if (!data.rollos || data.rollos.length === 0) {
      throw new Error('Debe ingresar al menos un rollo de tela');
    }

    const now = new Date().toISOString();
    const movimientoId = generateUUID();
    const baseSeq = this.getNextRolloSequence();

    const nuevoMovimiento: MovimientoInventario = {
      id: movimientoId,
      tipo_movimiento: 'IN',
      motivo: data.motivo,
      documento_referencia: data.documento_referencia.trim() || 'S/N',
      entidad_origen_destino: data.entidad_origen_destino.trim(),
      observaciones: data.observaciones.trim(),
      registrado_por: data.registrado_por.trim() || 'Almacenero Principal',
      created_at: now,
    };

    const nuevosRollos: Rollo[] = [];
    const nuevosDetalles: MovimientoDetalle[] = [];
    const seenBatchCodes = new Set<string>();

    data.rollos.forEach((r, idx) => {
      const rolloId = generateUUID();
      const codigoRollo = r.codigo_rollo?.trim() || generateCodigoRollo(baseSeq + idx);
      const upperCode = codigoRollo.toUpperCase();

      if (seenBatchCodes.has(upperCode)) {
        throw new Error(`El código de rollo ${codigoRollo} está duplicado dentro del mismo lote.`);
      }
      seenBatchCodes.add(upperCode);

      const existeCodigo = this.rollos.some(
        (existing) => existing.codigo_rollo.toUpperCase() === upperCode
      );
      if (existeCodigo) {
        throw new Error(`El código de rollo ${codigoRollo} ya se encuentra registrado en almacén.`);
      }

      const rollo: Rollo = {
        id: rolloId,
        tela_id: r.tela_id,
        codigo_rollo: codigoRollo,
        metraje: Number(Number(r.metraje).toFixed(2)),
        lote: r.lote.trim() || 'LOTE-STD',
        ubicacion: r.ubicacion.trim() || 'Almacén Central',
        estado: 'DISPONIBLE',
        fecha_ingreso: now,
        fecha_salida: null,
        created_at: now,
      };

      const detalle: MovimientoDetalle = {
        id: generateUUID(),
        movimiento_id: movimientoId,
        rollo_id: rolloId,
        metraje_movimiento: rollo.metraje,
        created_at: now,
      };

      nuevosRollos.push(rollo);
      nuevosDetalles.push(detalle);
    });

    this.movimientos.unshift(nuevoMovimiento);
    this.rollos.push(...nuevosRollos);
    this.detalles.push(...nuevosDetalles);
    this.persist();

    // Persistir en Supabase (ochotex_bd)
    void (async () => {
      try {
        await supabaseRest.insert('movimientos_inventario', {
          ...nuevoMovimiento,
          usuario_id: this.currentUser?.id || null,
        });
        await supabaseRest.insert('rollos', nuevosRollos);
        await supabaseRest.insert('movimiento_detalles', nuevosDetalles);
      } catch (e) {
        console.error('Error sincronizando ingreso en Supabase:', e);
      }
    })();

    return { movimientoId, rollosCreados: nuevosRollos };
  }

  // ==========================================
  // FLUJO B: Salida Directa de Mercadería (OUT)
  // ==========================================
  public registrarSalida(data: {
    motivo: 'VENTA' | 'MERMA' | 'MUESTRA';
    documento_referencia: string;
    entidad_origen_destino: string;
    observaciones: string;
    registrado_por: string;
    rolloIds: string[];
  }): { movimientoId: string; rollosDespachados: Rollo[] } {
    if (!data.rolloIds || data.rolloIds.length === 0) {
      throw new Error('Debe seleccionar al menos un rollo para la salida');
    }

    const now = new Date().toISOString();
    const estadoDestino: EstadoRollo = data.motivo === 'MERMA' ? 'MERMA' : 'VENDIDO';

    const rollosSeleccionados: Rollo[] = [];
    for (const rId of data.rolloIds) {
      const rollo = this.rollos.find((r) => r.id === rId);
      if (!rollo) {
        throw new Error(`Rollo no encontrado (ID: ${rId})`);
      }
      if (rollo.estado !== 'DISPONIBLE' && rollo.estado !== 'RESERVADO') {
        throw new Error(
          `El rollo ${rollo.codigo_rollo} no está disponible ni reservado (Estado actual: ${rollo.estado})`
        );
      }
      rollosSeleccionados.push(rollo);
    }

    const movimientoId = generateUUID();

    const nuevoMovimiento: MovimientoInventario = {
      id: movimientoId,
      tipo_movimiento: 'OUT',
      motivo: data.motivo,
      documento_referencia: data.documento_referencia.trim() || 'S/N',
      entidad_origen_destino: data.entidad_origen_destino.trim(),
      observaciones: data.observaciones.trim(),
      registrado_por: data.registrado_por.trim() || 'Almacenero Principal',
      created_at: now,
    };

    const nuevosDetalles: MovimientoDetalle[] = [];
    rollosSeleccionados.forEach((rollo) => {
      rollo.estado = estadoDestino;
      rollo.fecha_salida = now;

      nuevosDetalles.push({
        id: generateUUID(),
        movimiento_id: movimientoId,
        rollo_id: rollo.id,
        metraje_movimiento: rollo.metraje,
        created_at: now,
      });
    });

    this.movimientos.unshift(nuevoMovimiento);
    this.detalles.push(...nuevosDetalles);
    this.persist();

    // Persistir en Supabase (ochotex_bd)
    void (async () => {
      try {
        await supabaseRest.insert('movimientos_inventario', {
          ...nuevoMovimiento,
          usuario_id: this.currentUser?.id || null,
        });
        for (const r of rollosSeleccionados) {
          await supabaseRest.update('rollos', `id=eq.${r.id}`, {
            estado: estadoDestino,
            fecha_salida: now,
          });
        }
        await supabaseRest.insert('movimiento_detalles', nuevosDetalles);
      } catch (e) {
        console.error('Error sincronizando salida en Supabase:', e);
      }
    })();

    return { movimientoId, rollosDespachados: rollosSeleccionados };
  }

  // ==========================================
  // MÓDULO PUNTO DE VENTA (POS) & ÓRDENES DE PEDIDO
  // ==========================================
  public generateCodigoPedido(): string {
    const year = new Date().getFullYear();
    let maxNum = this.pedidos.length;
    this.pedidos.forEach((p) => {
      const m = p.codigo_pedido.match(/(\d+)$/);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val > maxNum) maxNum = val;
      }
    });
    return `PED-${year}-${String(maxNum + 1).padStart(5, '0')}`;
  }

  public crearOrdenPedido(data: {
    cliente_nombre: string;
    cliente_documento: string;
    cliente_telefono?: string;
    observaciones?: string;
    registrado_por: string;
    items: Array<{
      rollo_id: string;
      precio_metro: number;
    }>;
  }): PedidoCompleto {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe agregar al menos un rollo en stock para generar el pedido');
    }
    if (!data.cliente_nombre.trim()) {
      throw new Error('El nombre o Razón Social del cliente es obligatorio');
    }

    const now = new Date().toISOString();
    const pedidoId = generateUUID();
    const codigoPedido = this.generateCodigoPedido();

    let totalMetros = 0;
    let totalImporte = 0;
    const detallesNuevos: PedidoDetalle[] = [];
    const rollosReservadosIds: string[] = [];

    data.items.forEach((item) => {
      const rollo = this.rollos.find((r) => r.id === item.rollo_id);
      if (!rollo) {
        throw new Error(`Rollo no encontrado (${item.rollo_id})`);
      }
      if (rollo.estado !== 'DISPONIBLE') {
        throw new Error(
          `El rollo ${rollo.codigo_rollo} ya no está disponible (Estado: ${rollo.estado})`
        );
      }

      const metraje = Number(rollo.metraje);
      const precio = Number(item.precio_metro) || 0;
      const subtotal = Number((metraje * precio).toFixed(2));

      totalMetros += metraje;
      totalImporte += subtotal;

      rollo.estado = 'RESERVADO';
      rollosReservadosIds.push(rollo.id);

      detallesNuevos.push({
        id: generateUUID(),
        pedido_id: pedidoId,
        rollo_id: rollo.id,
        metraje,
        precio_metro: precio,
        subtotal,
        created_at: now,
      });
    });

    const nuevoPedido: Pedido = {
      id: pedidoId,
      codigo_pedido: codigoPedido,
      cliente_nombre: data.cliente_nombre.trim(),
      cliente_documento: data.cliente_documento.trim() || 'S/D',
      cliente_telefono: data.cliente_telefono?.trim() || '',
      estado: 'PENDIENTE_FACTURACION',
      total_rollos: data.items.length,
      total_metros: Number(totalMetros.toFixed(2)),
      total_importe: Number(totalImporte.toFixed(2)),
      numero_factura: null,
      numero_guia: null,
      observaciones: data.observaciones?.trim() || '',
      registrado_por: data.registrado_por.trim() || 'Ventas 8tex',
      created_at: now,
      facturado_at: null,
    };

    this.pedidos.unshift(nuevoPedido);
    this.pedidoDetalles.push(...detallesNuevos);
    this.persist();

    // Sincronizar con Supabase (ochotex_bd)
    void (async () => {
      try {
        await supabaseRest.insert('pedidos', {
          ...nuevoPedido,
          usuario_id: this.currentUser?.id || null,
        });
        await supabaseRest.insert('pedido_detalles', detallesNuevos);
        for (const rId of rollosReservadosIds) {
          await supabaseRest.update('rollos', `id=eq.${rId}`, { estado: 'RESERVADO' });
        }
      } catch (e) {
        console.error('Error sincronizando pedido en Supabase:', e);
      }
    })();

    return this.getPedidoById(pedidoId)!;
  }

  public confirmarFacturacionPedido(
    pedidoId: string,
    data: {
      numero_factura: string;
      numero_guia?: string;
      registrado_por?: string;
    }
  ): { pedido: PedidoCompleto; movimientoId: string } {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }
    if (pedido.estado !== 'PENDIENTE_FACTURACION') {
      throw new Error(`El pedido ${pedido.codigo_pedido} ya se encuentra ${pedido.estado}`);
    }
    if (!data.numero_factura.trim()) {
      throw new Error('Debe especificar el número de Factura o Boleta SUNAT para confirmar');
    }

    const itemsPedido = this.pedidoDetalles.filter((pd) => pd.pedido_id === pedidoId);
    const rolloIds = itemsPedido.map((i) => i.rollo_id);

    const numGuiaTexto = data.numero_guia?.trim() ? ` / Guía: ${data.numero_guia.trim()}` : '';
    const docRef = `${data.numero_factura.trim()}${numGuiaTexto} (Pedido: ${pedido.codigo_pedido})`;

    const outRes = this.registrarSalida({
      motivo: 'VENTA',
      documento_referencia: docRef,
      entidad_origen_destino: pedido.cliente_nombre,
      observaciones: `Facturación y despacho de orden ${pedido.codigo_pedido}. ${pedido.observaciones || ''}`.trim(),
      registrado_por: data.registrado_por || pedido.registrado_por,
      rolloIds,
    });

    const now = new Date().toISOString();
    pedido.estado = 'FACTURADO';
    pedido.numero_factura = data.numero_factura.trim();
    pedido.numero_guia = data.numero_guia?.trim() || null;
    pedido.facturado_at = now;

    this.persist();

    void (async () => {
      try {
        await supabaseRest.update('pedidos', `id=eq.${pedidoId}`, {
          estado: 'FACTURADO',
          numero_factura: pedido.numero_factura,
          numero_guia: pedido.numero_guia,
          facturado_at: now,
        });
      } catch (e) {
        console.error('Error sincronizando facturación en Supabase:', e);
      }
    })();

    return {
      pedido: this.getPedidoById(pedidoId)!,
      movimientoId: outRes.movimientoId,
    };
  }

  public anularPedido(pedidoId: string, motivoAnulacion?: string) {
    const pedido = this.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }
    if (pedido.estado !== 'PENDIENTE_FACTURACION') {
      throw new Error(`No se puede anular un pedido en estado ${pedido.estado}`);
    }

    const itemsPedido = this.pedidoDetalles.filter((pd) => pd.pedido_id === pedidoId);
    const rollosLiberadosIds: string[] = [];

    itemsPedido.forEach((item) => {
      const rollo = this.rollos.find((r) => r.id === item.rollo_id);
      if (rollo && rollo.estado === 'RESERVADO') {
        rollo.estado = 'DISPONIBLE';
        rollosLiberadosIds.push(rollo.id);
      }
    });

    pedido.estado = 'ANULADO';
    if (motivoAnulacion) {
      pedido.observaciones = `${pedido.observaciones ? pedido.observaciones + ' · ' : ''}ANULADO: ${motivoAnulacion}`;
    }

    this.persist();

    void (async () => {
      try {
        await supabaseRest.update('pedidos', `id=eq.${pedidoId}`, {
          estado: 'ANULADO',
          observaciones: pedido.observaciones,
        });
        for (const rId of rollosLiberadosIds) {
          await supabaseRest.update('rollos', `id=eq.${rId}`, { estado: 'DISPONIBLE' });
        }
      } catch (e) {
        console.error('Error sincronizando anulación en Supabase:', e);
      }
    })();
  }

  public getPedidosCompletos(): PedidoCompleto[] {
    const rollosMap = new Map<string, Rollo>();
    this.rollos.forEach((r) => rollosMap.set(r.id, r));

    const telaMap = new Map<string, Tela>();
    this.telas.forEach((t) => telaMap.set(t.id, t));

    return this.pedidos.map((p) => {
      const detList = this.pedidoDetalles.filter((pd) => pd.pedido_id === p.id);
      const detallesEnriquecidos = detList.map((pd) => {
        const rollo = rollosMap.get(pd.rollo_id);
        const tela = rollo ? telaMap.get(rollo.tela_id) : undefined;
        return {
          id: pd.id,
          rollo_id: pd.rollo_id,
          codigo_rollo: rollo ? rollo.codigo_rollo : 'N/A',
          metraje: pd.metraje,
          precio_metro: pd.precio_metro,
          subtotal: pd.subtotal,
          tela_nombre: tela ? tela.nombre : 'Desconocida',
          tela_color: tela ? tela.color : 'N/A',
          lote: rollo?.lote,
          ubicacion: rollo?.ubicacion,
        };
      });

      return {
        ...p,
        detalles: detallesEnriquecidos,
      };
    });
  }

  public getPedidoById(pedidoId: string): PedidoCompleto | null {
    const pedidos = this.getPedidosCompletos();
    return pedidos.find((p) => p.id === pedidoId) || null;
  }

  public getPedidosPendientes(): PedidoCompleto[] {
    return this.getPedidosCompletos().filter((p) => p.estado === 'PENDIENTE_FACTURACION');
  }

  // ==========================================
  // Consultas Generales y Kárdex
  // ==========================================
  public getTelas(): Tela[] {
    return [...this.telas];
  }

  public saveTela(telaData: Partial<Tela> & { nombre: string; codigo: string }): Tela {
    const now = new Date().toISOString();
    if (telaData.id) {
      const idx = this.telas.findIndex((t) => t.id === telaData.id);
      if (idx === -1) throw new Error('Tela no encontrada');
      const updated: Tela = {
        ...this.telas[idx],
        ...telaData,
        codigo_color: String(telaData.codigo_color ?? this.telas[idx].codigo_color ?? '').trim(),
        linea: telaData.linea?.trim() ?? this.telas[idx].linea ?? 'General',
        lote: telaData.lote?.trim() ?? this.telas[idx].lote ?? 'LOT-2026-STD',
        ancho: Number(telaData.ancho ?? this.telas[idx].ancho ?? 1.5),
        metraje_estandar: Number(telaData.metraje_estandar ?? this.telas[idx].metraje_estandar ?? 50),
        updated_at: now,
      };
      this.telas[idx] = updated;
      this.persist();

      void supabaseRest.update('telas', `id=eq.${updated.id}`, updated).catch((e) =>
        console.error('Error actualizando tela en Supabase:', e)
      );

      return updated;
    } else {
      const existe = this.telas.some(
        (t) => t.codigo.toUpperCase() === telaData.codigo.trim().toUpperCase()
      );
      if (existe) {
        throw new Error(`El código de artículo ${telaData.codigo} ya está en uso.`);
      }
      const newTela: Tela = {
        id: generateUUID(),
        codigo: telaData.codigo.trim().toUpperCase(),
        nombre: telaData.nombre.trim(),
        codigo_color: String(telaData.codigo_color || '').trim(),
        color: telaData.color?.trim() || 'Estándar',
        linea: telaData.linea?.trim() || 'Línea General',
        lote: telaData.lote?.trim() || 'LOT-2026-STD',
        ancho: Number(telaData.ancho) || 1.5,
        metraje_estandar: Number(telaData.metraje_estandar) || 50.0,
        unidad_medida: 'METROS',
        stock_minimo_alerta: Number(telaData.stock_minimo_alerta) || 0,
        activo: telaData.activo ?? true,
        created_at: now,
        updated_at: now,
      };
      this.telas.push(newTela);
      this.persist();

      void supabaseRest.insert('telas', newTela).catch((e) =>
        console.error('Error insertando tela en Supabase:', e)
      );

      return newTela;
    }
  }

  public deleteTela(telaId: string): void {
    const idx = this.telas.findIndex((t) => t.id === telaId);
    if (idx === -1) throw new Error('Tela no encontrada');

    const rollosDeTela = this.rollos.filter((r) => r.tela_id === telaId);
    const rolloIds = new Set(rollosDeTela.map((r) => r.id));

    this.pedidoDetalles = this.pedidoDetalles.filter((pd) => !rolloIds.has(pd.rollo_id));
    this.detalles = this.detalles.filter((d) => !rolloIds.has(d.rollo_id));
    this.rollos = this.rollos.filter((r) => r.tela_id !== telaId);
    this.telas.splice(idx, 1);
    this.persist();

    void (async () => {
      try {
        for (const rId of rolloIds) {
          await supabaseRest.remove('pedido_detalles', `rollo_id=eq.${rId}`);
          await supabaseRest.remove('movimiento_detalles', `rollo_id=eq.${rId}`);
        }
        await supabaseRest.remove('rollos', `tela_id=eq.${telaId}`);
        await supabaseRest.remove('telas', `id=eq.${telaId}`);
      } catch (e) {
        console.error('Error eliminando tela en Supabase:', e);
      }
    })();
  }

  public deleteRollo(rolloId: string): void {
    const idx = this.rollos.findIndex((r) => r.id === rolloId);
    if (idx === -1) throw new Error('Rollo no encontrado');

    this.pedidoDetalles = this.pedidoDetalles.filter((pd) => pd.rollo_id !== rolloId);
    this.detalles = this.detalles.filter((d) => d.rollo_id !== rolloId);
    this.rollos.splice(idx, 1);
    this.persist();

    void (async () => {
      try {
        await supabaseRest.remove('pedido_detalles', `rollo_id=eq.${rolloId}`);
        await supabaseRest.remove('movimiento_detalles', `rollo_id=eq.${rolloId}`);
        await supabaseRest.remove('rollos', `id=eq.${rolloId}`);
      } catch (e) {
        console.error('Error eliminando rollo en Supabase:', e);
      }
    })();
  }

  public deletePedido(pedidoId: string): void {
    const idx = this.pedidos.findIndex((p) => p.id === pedidoId);
    if (idx === -1) throw new Error('Pedido no encontrado');

    const itemsPedido = this.pedidoDetalles.filter((pd) => pd.pedido_id === pedidoId);
    const rollosLiberadosIds: string[] = [];

    itemsPedido.forEach((item) => {
      const rollo = this.rollos.find((r) => r.id === item.rollo_id);
      if (rollo && rollo.estado === 'RESERVADO') {
        rollo.estado = 'DISPONIBLE';
        rollosLiberadosIds.push(rollo.id);
      }
    });

    this.pedidoDetalles = this.pedidoDetalles.filter((pd) => pd.pedido_id !== pedidoId);
    this.pedidos.splice(idx, 1);
    this.persist();

    void (async () => {
      try {
        for (const rId of rollosLiberadosIds) {
          await supabaseRest.update('rollos', `id=eq.${rId}`, { estado: 'DISPONIBLE' });
        }
        await supabaseRest.remove('pedido_detalles', `pedido_id=eq.${pedidoId}`);
        await supabaseRest.remove('pedidos', `id=eq.${pedidoId}`);
      } catch (e) {
        console.error('Error eliminando pedido en Supabase:', e);
      }
    })();
  }

  public deleteMovimiento(movimientoId: string): void {
    const idx = this.movimientos.findIndex((m) => m.id === movimientoId);
    if (idx === -1) throw new Error('Movimiento no encontrado');

    const mov = this.movimientos[idx];
    const dets = this.detalles.filter((d) => d.movimiento_id === movimientoId);
    const rollosRestauradosIds: string[] = [];

    if (mov.tipo_movimiento === 'OUT') {
      dets.forEach((d) => {
        const rollo = this.rollos.find((r) => r.id === d.rollo_id);
        if (rollo && (rollo.estado === 'VENDIDO' || rollo.estado === 'MERMA')) {
          rollo.estado = 'DISPONIBLE';
          rollo.fecha_salida = null;
          rollosRestauradosIds.push(rollo.id);
        }
      });
    }

    this.detalles = this.detalles.filter((d) => d.movimiento_id !== movimientoId);
    this.movimientos.splice(idx, 1);
    this.persist();

    void (async () => {
      try {
        for (const rId of rollosRestauradosIds) {
          await supabaseRest.update('rollos', `id=eq.${rId}`, {
            estado: 'DISPONIBLE',
            fecha_salida: null,
          });
        }
        await supabaseRest.remove('movimiento_detalles', `movimiento_id=eq.${movimientoId}`);
        await supabaseRest.remove('movimientos_inventario', `id=eq.${movimientoId}`);
      } catch (e) {
        console.error('Error eliminando movimiento en Supabase:', e);
      }
    })();
  }

  public getRollos(): Rollo[] {
    return [...this.rollos];
  }

  public getRollosConTela(): RolloConTela[] {
    const telaMap = new Map<string, Tela>();
    this.telas.forEach((t) => telaMap.set(t.id, t));

    return this.rollos.map((r) => {
      const tela = telaMap.get(r.tela_id);
      return {
        ...r,
        tela_nombre: tela ? tela.nombre : 'Desconocida',
        tela_codigo: tela ? tela.codigo : 'N/A',
        tela_codigo_color: tela ? tela.codigo_color || '' : '',
        tela_color: tela ? tela.color : 'N/A',
        tela_linea: tela ? tela.linea || '' : '',
        tela_ancho: tela ? Number(tela.ancho) || 1.5 : 1.5,
        unidad_medida: tela ? tela.unidad_medida : 'METROS',
      };
    });
  }

  public getMovimientosCompletos(): MovimientoCompleto[] {
    const rollosMap = new Map<string, Rollo>();
    this.rollos.forEach((r) => rollosMap.set(r.id, r));

    const telaMap = new Map<string, Tela>();
    this.telas.forEach((t) => telaMap.set(t.id, t));

    return this.movimientos.map((m) => {
      const detList = this.detalles.filter((d) => d.movimiento_id === m.id);
      const detallesEnriquecidos = detList.map((d) => {
        const rollo = rollosMap.get(d.rollo_id);
        const tela = rollo ? telaMap.get(rollo.tela_id) : undefined;
        return {
          id: d.id,
          rollo_id: d.rollo_id,
          codigo_rollo: rollo ? rollo.codigo_rollo : 'N/A',
          metraje_movimiento: Number(d.metraje_movimiento),
          tela_nombre: tela ? tela.nombre : 'Desconocida',
          tela_color: tela ? tela.color : 'N/A',
          ubicacion: rollo ? rollo.ubicacion : undefined,
        };
      });

      const totalRollos = detallesEnriquecidos.length;
      const totalMetraje = Number(
        detallesEnriquecidos.reduce((acc, curr) => acc + curr.metraje_movimiento, 0).toFixed(2)
      );

      return {
        ...m,
        detalles: detallesEnriquecidos,
        total_rollos: totalRollos,
        total_metraje: totalMetraje,
      };
    });
  }

  public getRawData() {
    return {
      perfiles: this.perfiles,
      usuarios: this.usuarios,
      telas: this.telas,
      rollos: this.rollos,
      movimientos: this.movimientos,
      detalles: this.detalles,
      pedidos: this.pedidos,
      pedidoDetalles: this.pedidoDetalles,
    };
  }

  public importRawData(data: {
    perfiles?: Perfil[];
    usuarios?: Usuario[];
    telas?: Tela[];
    rollos?: Rollo[];
    movimientos?: MovimientoInventario[];
    detalles?: MovimientoDetalle[];
    pedidos?: Pedido[];
    pedidoDetalles?: PedidoDetalle[];
  }) {
    if (data.perfiles) this.perfiles = data.perfiles;
    if (data.usuarios) this.usuarios = data.usuarios;
    if (data.telas) this.telas = data.telas;
    if (data.rollos) this.rollos = data.rollos;
    if (data.movimientos) this.movimientos = data.movimientos;
    if (data.detalles) this.detalles = data.detalles;
    if (data.pedidos) this.pedidos = data.pedidos;
    if (data.pedidoDetalles) this.pedidoDetalles = data.pedidoDetalles;
    this.persist();
  }
}

export const inventoryStore = new InventoryStore();
