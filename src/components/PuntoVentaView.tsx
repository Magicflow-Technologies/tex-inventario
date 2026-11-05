import React, { useState, useMemo, useEffect } from 'react';
import { Tela, RolloConTela, PedidoCompleto, Cliente } from '../types/inventory';
import { inventoryStore, normalizeLinea, normalizeSpaces } from '../services/inventoryStore';
import {
  ShoppingCart,
  Search,
  XCircle,
  User,
  ChevronDown,
  Wallet,
  CalendarCheck,
  Clock,
  CheckCircle2,
  Lock,
  Check,
  Plus,
  X,
  Trash2,
  Printer,
  Mail,
  MessageCircle,
  UserPlus,
  Layers,
} from 'lucide-react';

interface PuntoVentaViewProps {
  telas: Tela[];
  clientes?: Cliente[];
  initialTelaId?: string;
  initialClienteId?: string;
  defaultRegistradoPor?: string;
  onPedidoCreado: (pedido: PedidoCompleto) => void;
  onIrAPedidosPendientes: () => void;
  onIrAClientes?: () => void;
}

interface VarianteColorNodo {
  tela: Tela;
  codigoColor: string;
  nombreColor: string;
  nombreComercial: string;
  badgeColor: string;
  precioLista: number;
  rollos: RolloConTela[];
}

interface ArticuloJerarquico {
  codigoArticulo: string;
  nombreBase: string;
  colores: VarianteColorNodo[];
}

interface LineaJerarquica {
  linea: string;
  articulos: ArticuloJerarquico[];
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

function getPrecioListaSugerido(tela: Tela): number {
  const precioCat = Number(tela.precio_lista);
  if (!Number.isNaN(precioCat) && precioCat > 0) {
    return Number(precioCat.toFixed(2));
  }
  const cod = (tela.codigo || '').toUpperCase();
  const col = (tela.codigo_color || '').toUpperCase();
  if (cod === 'C-900') {
    if (col === '2001' || col === '2002') return 13.5;
    if (col === '2003' || col === '2004') return 13.0;
    return 12.5;
  }
  if (cod.includes('TIZZ')) return 38.5;
  if (cod.includes('DRIL')) return 24.0;
  if (cod.includes('POPL')) return 16.0;
  if (cod.includes('FRAN')) return 19.5;
  return 13.0;
}

export const PuntoVentaView: React.FC<PuntoVentaViewProps> = ({
  telas,
  clientes = [],
  initialTelaId,
  initialClienteId,
  defaultRegistradoPor,
  onPedidoCreado,
  onIrAPedidosPendientes,
  onIrAClientes,
}) => {
  // Búsqueda y filtro por línea
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');
  const [lineaFiltro, setLineaFiltro] = useState<string>('TODAS');

  // Cliente asignado (de la cartera `ochotex_bd.clientes` o manual)
  const [selectedClienteId, setSelectedClienteId] = useState<string>(initialClienteId || '');
  const [clienteNombre, setClienteNombre] = useState<string>(
    clientes[0]?.razon_social || 'Confecciones Gamarra Moda S.A.C.'
  );
  const [clienteRuc, setClienteRuc] = useState<string>(clientes[0]?.ruc || '20601234567');
  const [clienteTelefono, setClienteTelefono] = useState<string>(clientes[0]?.telefonos || '');
  const [clienteCorreo, setClienteCorreo] = useState<string>(
    clientes[0]?.correos || 'ventas@ochotex.pe'
  );
  const [clienteDireccion, setClienteDireccion] = useState<string>(clientes[0]?.direccion || '');

  // Modal selector de clientes
  const [isModalClientesOpen, setIsModalClientesOpen] = useState<boolean>(false);
  const [busquedaClienteModal, setBusquedaClienteModal] = useState<string>('');

  // Condición de pago y letras
  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [numeroLetras, setNumeroLetras] = useState<1 | 2 | 3 | 4>(1);

  // Precios negociados individuales por variante de tela (tela.id -> precio)
  const [preciosNegociados, setPreciosNegociados] = useState<Record<string, number>>({});

  // Rollos seleccionados en el pedido
  const [rollosSeleccionadosIds, setRollosSeleccionadosIds] = useState<string[]>([]);

  // Acordeones de artículos y colores
  const [articulosAbiertos, setArticulosAbiertos] = useState<Record<string, boolean>>({});
  const [coloresAbiertos, setColoresAbiertos] = useState<Record<string, boolean>>({});

  // Modales de Carrito (móvil) y Pantalla de Éxito
  const [isCarritoOpen, setIsCarritoOpen] = useState<boolean>(false);
  const [pedidoExitoso, setPedidoExitoso] = useState<{
    pedido: PedidoCompleto;
    condicion: 'CONTADO' | 'CREDITO';
    letras: number;
    requiereAutorizacionJefe: boolean;
  } | null>(null);

  // Toast rápido
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const mostrarToastCalle = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  };

  // Sincronizar cliente inicial cuando viene desde la pestaña Clientes o carga la cartera
  useEffect(() => {
    if (initialClienteId) {
      const found = clientes.find((c) => c.id === initialClienteId);
      if (found) {
        setSelectedClienteId(found.id);
        setClienteNombre(found.razon_social);
        setClienteRuc(found.ruc);
        setClienteTelefono(found.telefonos || '');
        setClienteCorreo(found.correos || '');
        setClienteDireccion(found.direccion || '');
      }
    } else if (!selectedClienteId && clientes.length > 0) {
      const first = clientes[0];
      setSelectedClienteId(first.id);
      setClienteNombre(first.razon_social);
      setClienteRuc(first.ruc);
      setClienteTelefono(first.telefonos || '');
      setClienteCorreo(first.correos || '');
      setClienteDireccion(first.direccion || '');
    }
  }, [initialClienteId, clientes]);

  // Si viene desde Stock General con una tela preseleccionada (`initialTelaId`), abrir su acordeón
  useEffect(() => {
    if (initialTelaId) {
      const foundTela = telas.find((t) => t.id === initialTelaId);
      if (foundTela) {
        const cleanCod = normalizeSpaces(foundTela.codigo).toUpperCase();
        setArticulosAbiertos((prev) => ({ ...prev, [cleanCod]: true }));
        setColoresAbiertos((prev) => ({ ...prev, [foundTela.id]: true }));
      }
    }
  }, [initialTelaId, telas]);

  // Obtener todos los rollos físicos disponibles
  const allRollosDisponibles = useMemo(() => {
    return inventoryStore
      .getRollosConTela()
      .filter((r) => r.estado === 'DISPONIBLE')
      .sort((a, b) => new Date(a.fecha_ingreso).getTime() - new Date(b.fecha_ingreso).getTime());
  }, [telas, pedidoExitoso, rollosSeleccionadosIds]);

  // Mapa rápido de rollos por ID
  const rollosDisponiblesMap = useMemo(() => {
    const map = new Map<string, RolloConTela>();
    allRollosDisponibles.forEach((r) => map.set(r.id, r));
    return map;
  }, [allRollosDisponibles]);

  // Obtener precio lista y precio negociado de una tela
  const getPrecioLista = (tela: Tela): number => getPrecioListaSugerido(tela);
  const getPrecioNegociado = (tela: Tela): number => {
    if (preciosNegociados[tela.id] !== undefined) {
      return preciosNegociados[tela.id];
    }
    return getPrecioListaSugerido(tela);
  };

  const actualizarPrecioColor = (tela: Tela, nuevoValorStr: string) => {
    const parsed = parseFloat(nuevoValorStr);
    const val = Number.isNaN(parsed) ? getPrecioLista(tela) : Math.max(0.1, parsed);
    setPreciosNegociados((prev) => ({
      ...prev,
      [tela.id]: val,
    }));
  };

  // Construir estructura jerárquica: Línea (normalizada) > Artículo (normalizado) > Colores > Rollos
  const catalogoJerarquico = useMemo<LineaJerarquica[]>(() => {
    const rollosPorTela = new Map<string, RolloConTela[]>();
    allRollosDisponibles.forEach((r) => {
      const arr = rollosPorTela.get(r.tela_id) || [];
      arr.push(r);
      rollosPorTela.set(r.tela_id, arr);
    });

    const lineasMap = new Map<
      string,
      { displayLinea: string; artMap: Map<string, ArticuloJerarquico> }
    >();

    telas.forEach((t) => {
      const nombreLinea = normalizeLinea(t.linea);
      const lineaKey = nombreLinea.toLowerCase();

      if (!lineasMap.has(lineaKey)) {
        lineasMap.set(lineaKey, {
          displayLinea: nombreLinea,
          artMap: new Map<string, ArticuloJerarquico>(),
        });
      }

      const { artMap } = lineasMap.get(lineaKey)!;
      const codArt = normalizeSpaces(t.codigo || 'S/C').toUpperCase();
      const nombreComercialLimpio = normalizeSpaces(t.nombre).replace(/8Tex/g, '8tex');
      const nombreColorLimpio = normalizeSpaces(t.color) || 'Estándar';
      const codigoColorLimpio = normalizeSpaces(t.codigo_color) || '00';

      const rollosDeVariante = rollosPorTela.get(t.id) || [];
      const nodoColor: VarianteColorNodo = {
        tela: t,
        codigoColor: codigoColorLimpio,
        nombreColor: nombreColorLimpio,
        nombreComercial: nombreComercialLimpio,
        badgeColor: getColorHex(nombreColorLimpio),
        precioLista: getPrecioListaSugerido(t),
        rollos: rollosDeVariante,
      };

      if (!artMap.has(codArt)) {
        artMap.set(codArt, {
          codigoArticulo: codArt,
          nombreBase: nombreComercialLimpio,
          colores: [nodoColor],
        });
      } else {
        const existingArt = artMap.get(codArt)!;
        existingArt.colores.push(nodoColor);
        const nombresExistentes = existingArt.nombreBase
          .split(' / ')
          .map((n) => n.trim().toLowerCase());
        if (!nombresExistentes.includes(nombreComercialLimpio.toLowerCase())) {
          existingArt.nombreBase = `${existingArt.nombreBase} / ${nombreComercialLimpio}`;
        }
      }
    });

    // Ordenar colores poniendo primero los que tienen stock disponible
    const resultado: LineaJerarquica[] = [];
    lineasMap.forEach(({ displayLinea, artMap }) => {
      const articulos = Array.from(artMap.values()).map((art) => ({
        ...art,
        colores: [...art.colores].sort((a, b) => b.rollos.length - a.rollos.length),
      }));
      resultado.push({
        linea: displayLinea,
        articulos,
      });
    });

    return resultado;
  }, [telas, allRollosDisponibles]);

  // Todas las líneas únicas disponibles
  const lineasDisponibles = useMemo(() => {
    return catalogoJerarquico.map((g) => g.linea);
  }, [catalogoJerarquico]);

  // Filtrar catálogo jerárquico según línea y buscador completo multi-palabra
  const catalogoFiltrado = useMemo<LineaJerarquica[]>(() => {
    const tokens = busquedaTexto
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return catalogoJerarquico
      .filter(
        (grupoLinea) =>
          lineaFiltro === 'TODAS' ||
          grupoLinea.linea.toLowerCase() === lineaFiltro.toLowerCase()
      )
      .map((grupoLinea) => {
        const articulosVisibles = grupoLinea.articulos
          .map((art) => {
            const coloresFiltrados = art.colores.filter((col) => {
              if (tokens.length === 0) return true;

              const rollosText = col.rollos
                .map(
                  (r) =>
                    `${r.codigo_rollo} ${r.metraje.toFixed(2)} ${r.metraje}m ${r.lote || ''} ${
                      r.ubicacion || ''
                    }`
                )
                .join(' ');

              const fullVariantText = [
                grupoLinea.linea,
                art.codigoArticulo,
                art.nombreBase,
                col.codigoColor,
                `cod. ${col.codigoColor}`,
                `cód. ${col.codigoColor}`,
                col.nombreColor,
                col.nombreComercial,
                rollosText,
              ]
                .join(' ')
                .toLowerCase();

              return tokens.every((tok) => fullVariantText.includes(tok));
            });

            return { ...art, colores: coloresFiltrados };
          })
          .filter((art) => art.colores.length > 0);

        return {
          ...grupoLinea,
          articulos: articulosVisibles,
        };
      })
      .filter((grupoLinea) => grupoLinea.articulos.length > 0);
  }, [catalogoJerarquico, lineaFiltro, busquedaTexto]);

  // Rollos seleccionados enriquecidos con su tela y precio negociado
  const rollosSeleccionadosDetalle = useMemo(() => {
    const telaMap = new Map<string, Tela>();
    telas.forEach((t) => telaMap.set(t.id, t));

    return rollosSeleccionadosIds
      .map((id) => {
        const rollo = rollosDisponiblesMap.get(id);
        if (!rollo) return null;
        const tela = telaMap.get(rollo.tela_id);
        if (!tela) return null;
        const precioLista = getPrecioLista(tela);
        const precioNegociado = getPrecioNegociado(tela);
        return {
          rollo,
          tela,
          precioLista,
          precioNegociado,
          subtotal: Number(rollo.metraje) * precioNegociado,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [rollosSeleccionadosIds, rollosDisponiblesMap, telas, preciosNegociados]);

  // Totales en vivo
  const totalRollos = rollosSeleccionadosDetalle.length;
  const totalMetros = rollosSeleccionadosDetalle.reduce(
    (acc, item) => acc + Number(item.rollo.metraje),
    0
  );
  const totalSoles = rollosSeleccionadosDetalle.reduce((acc, item) => acc + item.subtotal, 0);
  const montoPorLetra = totalSoles / (numeroLetras || 1);

  // Regla Comercial Dinámica (HU-010 / HU-019)
  const algunPrecioRebajado = useMemo(() => {
    return rollosSeleccionadosDetalle.some((item) => item.precioNegociado < item.precioLista);
  }, [rollosSeleccionadosDetalle]);

  const requiereAprobacionJefeVentas = condicionPago === 'CREDITO' && algunPrecioRebajado;

  // Toggle acordeón artículo
  const toggleArticulo = (codigoArticulo: string) => {
    setArticulosAbiertos((prev) => ({
      ...prev,
      [codigoArticulo]: !(prev[codigoArticulo] ?? true),
    }));
  };

  // Toggle acordeón variante de color
  const toggleColorDesglose = (telaId: string, defaultOpen: boolean) => {
    setColoresAbiertos((prev) => ({
      ...prev,
      [telaId]: !(prev[telaId] ?? defaultOpen),
    }));
  };

  // Marcar / Desmarcar Rollo Físico
  const toggleRolloCalle = (rollo: RolloConTela) => {
    setRollosSeleccionadosIds((prev) => {
      const existe = prev.includes(rollo.id);
      if (existe) {
        mostrarToastCalle('Rollo retirado del pedido');
        return prev.filter((id) => id !== rollo.id);
      } else {
        mostrarToastCalle(`+ ${rollo.metraje.toFixed(2)} m agregados al pedido`);
        return [...prev, rollo.id];
      }
    });
  };

  // Escaneo rápido con Enter en el buscador
  const handleBuscadorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busquedaTexto.trim();
    if (!q) return;

    const exactRollo = allRollosDisponibles.find(
      (r) => r.codigo_rollo.toUpperCase() === q.toUpperCase() || r.id === q
    );
    if (exactRollo) {
      toggleRolloCalle(exactRollo);
      setBusquedaTexto('');
    }
  };

  // Agrupación de ítems en el Carrito por Variante de Color
  const gruposEnCarrito = useMemo(() => {
    const map = new Map<
      string,
      {
        tela: Tela;
        precioLista: number;
        precioNegociado: number;
        rollos: RolloConTela[];
        metrosSubtotal: number;
        subtotalSoles: number;
      }
    >();

    rollosSeleccionadosDetalle.forEach((item) => {
      const key = item.tela.id;
      const actual = map.get(key);
      if (!actual) {
        map.set(key, {
          tela: item.tela,
          precioLista: item.precioLista,
          precioNegociado: item.precioNegociado,
          rollos: [item.rollo],
          metrosSubtotal: Number(item.rollo.metraje),
          subtotalSoles: item.subtotal,
        });
      } else {
        actual.rollos.push(item.rollo);
        actual.metrosSubtotal += Number(item.rollo.metraje);
        actual.subtotalSoles += item.subtotal;
      }
    });

    return Array.from(map.values());
  }, [rollosSeleccionadosDetalle]);

  // Clientes filtrados en el modal selector
  const clientesFiltradosModal = useMemo(() => {
    const q = busquedaClienteModal.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.razon_social.toLowerCase().includes(q) ||
        c.ruc.toLowerCase().includes(q) ||
        (c.nombre_contacto && c.nombre_contacto.toLowerCase().includes(q))
    );
  }, [clientes, busquedaClienteModal]);

  const seleccionarClienteDeCartera = (c: Cliente) => {
    setSelectedClienteId(c.id);
    setClienteNombre(c.razon_social);
    setClienteRuc(c.ruc);
    setClienteTelefono(c.telefonos || '');
    setClienteCorreo(c.correos || '');
    setClienteDireccion(c.direccion || '');
    setIsModalClientesOpen(false);
    mostrarToastCalle('Cliente asignado');
  };

  // Acciones de Cierre: WhatsApp, Correo, Imprimir y Confirmar Orden en Supabase
  const enviarPorWhatsApp = (codigoOrdenCustom?: string) => {
    const orden =
      codigoOrdenCustom ||
      pedidoExitoso?.pedido.codigo_pedido ||
      `PED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let desglose = '';
    rollosSeleccionadosDetalle.forEach((item) => {
      desglose += `• ${item.rollo.codigo_rollo} (${item.tela.color}): ${item.rollo.metraje.toFixed(
        2
      )}m x S/${item.precioNegociado.toFixed(2)} = S/${item.subtotal.toFixed(2)}\n`;
    });

    let metrosFinal = totalMetros;
    let solesFinal = totalSoles;
    let rollosCountFinal = totalRollos;

    if (rollosSeleccionadosDetalle.length === 0 && pedidoExitoso) {
      metrosFinal = pedidoExitoso.pedido.total_metros;
      solesFinal = pedidoExitoso.pedido.total_importe;
      rollosCountFinal = pedidoExitoso.pedido.total_rollos;
      desglose = pedidoExitoso.pedido.detalles
        .map(
          (d) =>
            `• ${d.codigo_rollo} (${d.tela_color}): ${d.metraje.toFixed(
              2
            )}m x S/${d.precio_metro.toFixed(2)} = S/${d.subtotal.toFixed(2)}`
        )
        .join('\n');
    }

    const textoCondicion =
      condicionPago === 'CREDITO'
        ? `CRÉDITO (${numeroLetras} letras de S/${(solesFinal / numeroLetras).toFixed(2)})`
        : 'CONTADO';

    const mensaje = `*8TEX · TEXTILES OCHO LUKAL*\n_PERÚ | Donde nacen las futuras tendencias_\n\n*ORDEN DE PEDIDO:* ${orden}\n*CLIENTE:* ${clienteNombre}\n*RUC:* ${clienteRuc}\n*CONDICIÓN:* ${textoCondicion}\n\n*ROLLOS SELECCIONADOS (${rollosCountFinal}):*\n${desglose}\n*TOTAL METRAJE:* ${metrosFinal.toFixed(
      2
    )} m\n*TOTAL A PAGAR:* S/ ${solesFinal.toFixed(
      2
    )}\n\n_Comprobante preliminar emitido en calle sujeto a validación de créditos/almacén._`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const enviarPorCorreo = () => {
    const orden = `PED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const email = (clienteCorreo || 'ventas@ochotex.pe').split(',')[0].trim();
    const asunto = `Orden de Pedido ${orden} - Textiles Ocho Lukal (8tex)`;

    let itemsTxt = '';
    rollosSeleccionadosDetalle.forEach((item) => {
      itemsTxt += `- Rollo: ${item.rollo.codigo_rollo} | Tela: ${item.tela.nombre} (${
        item.tela.color
      }) | Metros: ${item.rollo.metraje.toFixed(2)}m | Precio/m: S/ ${item.precioNegociado.toFixed(
        2
      )} | Subtotal: S/ ${item.subtotal.toFixed(2)}\n`;
    });

    const cuerpo = `Estimados ${clienteNombre},\n\nAdjuntamos el detalle de su orden de pedido levantada con 8tex:\n\nOrden: ${orden}\nRUC: ${clienteRuc}\nCondición de Pago: ${condicionPago} ${
      condicionPago === 'CREDITO' ? `(${numeroLetras} letras)` : ''
    }\n\nDetalle de Rollos Físicos:\n${itemsTxt}\nMetraje Total: ${totalMetros.toFixed(
      2
    )} m\nImporte Total: S/ ${totalSoles.toFixed(
      2
    )}\n\nAtentamente,\nEquipo Comercial 8tex\nDonde nacen las futuras tendencias`;

    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(cuerpo)}`;
    mostrarToastCalle('Abriendo cliente de correo...');
  };

  const imprimirPedido = () => {
    window.print();
  };

  const confirmarOrdenDesdeCarrito = () => {
    if (rollosSeleccionadosDetalle.length === 0) {
      mostrarToastCalle('Selecciona al menos 1 rollo');
      return;
    }

    if (!clienteNombre.trim()) {
      mostrarToastCalle('Selecciona o escribe la Razón Social del cliente');
      return;
    }

    const obsCondicion =
      condicionPago === 'CREDITO'
        ? `CRÉDITO (${numeroLetras} Letras - ${numeroLetras * 30} días) · Cuota aprox: S/ ${montoPorLetra.toFixed(
            2
          )}`
        : 'CONTADO';

    const obsRegla = requiereAprobacionJefeVentas
      ? 'Requiere autorización J. Ventas (precio rebajado a crédito)'
      : 'Pasa directo a Créditos';

    const observacionesFinales = [
      obsCondicion,
      obsRegla,
      clienteDireccion ? `Dir: ${clienteDireccion}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const nuevoPedido = inventoryStore.crearOrdenPedido({
        cliente_nombre: clienteNombre.trim(),
        cliente_documento: clienteRuc.trim() || 'S/D',
        cliente_telefono: clienteTelefono.trim() || undefined,
        observaciones: observacionesFinales,
        registrado_por: defaultRegistradoPor || 'Ventas 8tex',
        items: rollosSeleccionadosDetalle.map((item) => ({
          rollo_id: item.rollo.id,
          precio_metro: item.precioNegociado,
        })),
      });

      setIsCarritoOpen(false);
      setPedidoExitoso({
        pedido: nuevoPedido,
        condicion: condicionPago,
        letras: numeroLetras,
        requiereAutorizacionJefe: requiereAprobacionJefeVentas,
      });
      setRollosSeleccionadosIds([]);
      onPedidoCreado(nuevoPedido);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al registrar el pedido');
    }
  };

  const iniciarNuevoPedidoCalle = () => {
    setPedidoExitoso(null);
    setRollosSeleccionadosIds([]);
    mostrarToastCalle('Listo para nuevo pedido');
  };

  const labelLetrasMap: Record<number, string> = {
    1: '1 Letra (30 días)',
    2: '2 Letras (30 / 60 días)',
    3: '3 Letras (30 / 60 / 90 días)',
    4: '4 Letras (30 / 60 / 90 / 120 días)',
  };

  // Sub-componente reutilizable para renderizar una tarjeta de Variante de Color
  const renderTarjetaVarianteColor = (
    col: VarianteColorNodo,
    idxColor: number,
    isDesktop: boolean
  ) => {
    const totalMetrosColor = col.rollos.reduce((acc, r) => acc + Number(r.metraje), 0);
    const rollosCount = col.rollos.length;
    const tieneStock = rollosCount > 0;
    const defaultOpen = isDesktop ? tieneStock : idxColor === 0 && tieneStock;
    const abiertoColor =
      coloresAbiertos[col.tela.id] ?? (Boolean(busquedaTexto.trim()) ? tieneStock : defaultOpen);

    const precioNegociadoActual = getPrecioNegociado(col.tela);
    const precioRebajado = precioNegociadoActual < col.precioLista;

    const marcadosColor = col.rollos.filter((r) => rollosSeleccionadosIds.includes(r.id)).length;

    return (
      <div
        key={col.tela.id}
        className={`rounded-2xl border transition p-3 sm:p-3.5 space-y-2.5 flex flex-col justify-between ${
          marcadosColor > 0
            ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-500/10'
            : 'bg-white border-slate-200/80 shadow-2xs'
        }`}
      >
        <div className="space-y-2.5">
          {/* Fila Principal del Color (Tocable para ver Rollos) */}
          <div
            onClick={() => toggleColorDesglose(col.tela.id, defaultOpen)}
            className={`cursor-pointer flex items-center justify-between gap-2.5 ${
              tieneStock ? '' : 'opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <span
                  className={`px-2.5 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center border ${
                    tieneStock
                      ? 'bg-slate-900 text-white border-slate-800'
                      : 'bg-slate-200 text-slate-500 border-slate-300'
                  }`}
                >
                  {col.codigoColor}
                </span>
                <span
                  className="w-4 h-1.5 rounded-full mt-1"
                  style={{ backgroundColor: col.badgeColor }}
                />
              </div>

              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-800 truncate">
                  {col.nombreComercial}
                </h4>
                <p className="text-xs font-extrabold text-blue-700 truncate">{col.nombreColor}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div
                  className={`text-xs font-black font-mono ${
                    tieneStock ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {totalMetrosColor.toFixed(2)}{' '}
                  <span className="text-[10px] text-blue-600 font-bold font-sans">m</span>
                </div>
                <div
                  className={`text-[10px] font-bold ${
                    tieneStock ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {tieneStock
                    ? `${rollosCount} ${rollosCount === 1 ? 'rollo' : 'rollos'}`
                    : 'Agotado'}
                </div>
              </div>
              <div
                className={`w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs transition-transform ${
                  abiertoColor ? 'rotate-180' : ''
                }`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* P. METRO INDIVIDUAL PARA ESTE COLOR */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Precio / Metro Individual:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 font-semibold">
                  Lista: S/ {col.precioLista.toFixed(2)}
                </span>
                {precioRebajado && (
                  <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    Rebaja
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="font-black text-slate-700">S/</span>
              <input
                type="number"
                step="0.10"
                min="0.10"
                value={precioNegociadoActual}
                onChange={(e) => actualizarPrecioColor(col.tela, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={`w-20 text-right font-black text-xs bg-white border rounded-lg py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono ${
                  precioRebajado
                    ? 'border-amber-400 text-amber-900'
                    : 'border-blue-400 text-slate-900'
                }`}
              />
              <span className="text-[10px] text-slate-400 font-bold">/m</span>
            </div>
          </div>

          {/* Desglose de Rollos Físicos con Botón '+ Marcar' / '✓ Marcado' */}
          {abiertoColor && (
            <div className="space-y-1.5 pt-1">
              {tieneStock ? (
                col.rollos.map((rollo, idx) => {
                  const seleccionado = rollosSeleccionadosIds.includes(rollo.id);
                  return (
                    <div
                      key={rollo.id}
                      onClick={() => toggleRolloCalle(rollo)}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-2.5 border transition active:scale-98 cursor-pointer ${
                        seleccionado
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            seleccionado
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`font-mono text-[10px] font-bold flex items-center gap-1.5 flex-wrap ${
                              seleccionado ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            <span>{rollo.codigo_rollo}</span>
                            {rollo.ubicacion && <span>· {rollo.ubicacion}</span>}
                            {rollo.lote && <span>· {rollo.lote}</span>}
                          </div>
                          <div
                            className={`text-xs font-black font-mono ${
                              seleccionado ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {rollo.metraje.toFixed(2)} metros
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`h-8 px-3 rounded-lg text-xs font-black flex items-center gap-1 transition shrink-0 cursor-pointer ${
                          seleccionado
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-blue-700 border border-blue-300'
                        }`}
                      >
                        {seleccionado ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcado</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Marcar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-1">
                  Sin rollos físicos en almacén.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="select-none pb-24 lg:pb-6">
      {/* ========================================================================
          VISTA 1: MODO CELULAR (< lg) — Diseño ergonómico de una mano
          ======================================================================== */}
      <div className="lg:hidden max-w-md mx-auto bg-slate-100 rounded-3xl overflow-hidden border border-slate-200/90 shadow-md print:hidden">
        {/* TOP APP BAR MÓVIL */}
        <header className="sticky top-0 z-30 bg-[#0B2144] text-white shadow-md border-b border-blue-900/50">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-md border border-white/20">
                8t
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-widest text-white">8TEX</span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-400/30">
                    CALLE
                  </span>
                </div>
                <p className="text-[10px] text-blue-200 font-medium">
                  PERÚ | Donde nacen las futuras tendencias
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (totalRollos === 0) {
                  mostrarToastCalle('Selecciona al menos 1 rollo');
                } else {
                  setIsCarritoOpen(true);
                }
              }}
              className="relative w-10 h-10 rounded-2xl bg-blue-600/50 hover:bg-blue-600 text-white flex items-center justify-center active:scale-95 transition border border-white/20 shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalRollos > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-[#0B2144]">
                  {totalRollos}
                </span>
              )}
            </button>
          </div>

          {/* Buscador Móvil */}
          <div className="px-4 pb-3 pt-1">
            <form onSubmit={handleBuscadorSubmit} className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Buscar por artículo, color o rollo (ej: C-900, Silka, 4150)..."
                className="w-full bg-[#071833] text-white placeholder-slate-400 rounded-2xl pl-10 pr-10 py-3 text-xs font-semibold border border-blue-800/80 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
              />
              {busquedaTexto && (
                <button
                  type="button"
                  onClick={() => setBusquedaTexto('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </form>

            {/* Filtro Rápido por Línea (Solo si existen 2 o más líneas distintas) */}
            {lineasDisponibles.length > 1 && (
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setLineaFiltro('TODAS')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs whitespace-nowrap transition cursor-pointer ${
                    lineaFiltro === 'TODAS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Todas las Líneas
                </button>
                {lineasDisponibles.map((linea) => {
                  const activa = lineaFiltro.toLowerCase() === linea.toLowerCase();
                  return (
                    <button
                      key={linea}
                      type="button"
                      onClick={() => setLineaFiltro(linea)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                        activa
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {linea}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* SECCIÓN RÁPIDA DE CLIENTE & CONDICIÓN (MÓVIL) */}
        <section className="p-3.5 bg-white border-b border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 border border-blue-200">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cliente Asignado
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalClientesOpen(true)}
                  className="text-xs font-black text-slate-900 truncate hover:text-blue-700 flex items-center gap-1 text-left cursor-pointer"
                >
                  <span className="truncate">{clienteNombre || 'Seleccionar Cliente...'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalClientesOpen(true)}
              className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono font-bold shrink-0 border border-slate-200 active:scale-95 cursor-pointer"
            >
              {clienteRuc || 'Elegir RUC'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondicionPago('CONTADO')}
                className={`py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  condicionPago === 'CONTADO'
                    ? 'font-black bg-emerald-600 text-white shadow-xs'
                    : 'font-bold bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Contado</span>
              </button>
              <button
                type="button"
                onClick={() => setCondicionPago('CREDITO')}
                className={`py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  condicionPago === 'CREDITO'
                    ? 'font-black bg-amber-600 text-white shadow-xs'
                    : 'font-bold bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Crédito</span>
              </button>
            </div>

            {condicionPago === 'CREDITO' && (
              <div className="bg-amber-50/90 p-3 rounded-2xl border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-950 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Plazo (Letras):</span>
                  </span>
                  <span className="font-black text-amber-800 text-[11px] font-mono">
                    {labelLetrasMap[numeroLetras]}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {([1, 2, 3, 4] as const).map((cant) => (
                    <button
                      key={cant}
                      type="button"
                      onClick={() => setNumeroLetras(cant)}
                      className={`py-2 rounded-xl text-[11px] text-center transition cursor-pointer ${
                        numeroLetras === cant
                          ? 'font-black bg-amber-600 text-white shadow-xs'
                          : 'font-bold bg-white border border-amber-300 text-amber-900'
                      }`}
                    >
                      {cant}L ({cant * 30}d)
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-amber-900 font-semibold flex items-center justify-between pt-1 border-t border-amber-200/70">
                  <span>Monto por letra estimado:</span>
                  <strong className="font-black font-mono text-xs text-amber-950">
                    S/ {montoPorLetra.toFixed(2)} / cuota
                  </strong>
                </div>
              </div>
            )}

            <div
              className={`flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-xl border transition ${
                !requiereAprobacionJefeVentas
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              {!requiereAprobacionJefeVentas ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              )}
              <span>
                {condicionPago === 'CONTADO'
                  ? 'Venta al Contado: Pasa directo a Créditos / Facturación'
                  : !algunPrecioRebajado
                  ? 'Precios oficiales respetados: Pasa directo a Créditos'
                  : 'Requiere aprobación de Jefatura de Ventas (Crédito con rebaja)'}
              </span>
            </div>
          </div>
        </section>

        {/* LISTA JERÁRQUICA MÓVIL */}
        <main className="p-3 space-y-3">
          {catalogoFiltrado.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-400 space-y-2 border border-slate-200 shadow-2xs">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                No encontramos telas con ese criterio de búsqueda.
              </p>
            </div>
          ) : (
            catalogoFiltrado.map((grupoLinea) => (
              <section key={grupoLinea.linea} className="space-y-3">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    {grupoLinea.linea}
                  </h2>
                </div>

                {grupoLinea.articulos.map((art) => {
                  const abiertoArt = articulosAbiertos[art.codigoArticulo] ?? true;
                  let metrosTotalesArt = 0;
                  let rollosTotalesArt = 0;
                  art.colores.forEach((c) => {
                    metrosTotalesArt += c.rollos.reduce((acc, r) => acc + Number(r.metraje), 0);
                    rollosTotalesArt += c.rollos.length;
                  });

                  return (
                    <article
                      key={`${grupoLinea.linea}_${art.codigoArticulo}`}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition"
                    >
                      <div
                        onClick={() => toggleArticulo(art.codigoArticulo)}
                        className="p-3.5 bg-slate-50/80 hover:bg-slate-100 cursor-pointer flex items-center justify-between gap-3 border-b border-slate-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2.5 h-8 rounded-xl bg-blue-100 text-blue-800 font-mono text-xs font-black flex items-center justify-center shrink-0 border border-blue-200">
                            {art.codigoArticulo}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-xs font-black text-slate-900 truncate leading-snug">
                              {art.nombreBase}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold">
                              {art.colores.length}{' '}
                              {art.colores.length === 1 ? 'color disponible' : 'colores disponibles'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              {metrosTotalesArt.toFixed(2)}{' '}
                              <span className="text-[10px] text-blue-600 font-bold font-sans">m</span>
                            </span>
                            <div className="text-[10px] font-bold text-slate-500">
                              {rollosTotalesArt} {rollosTotalesArt === 1 ? 'rollo' : 'rollos'}
                            </div>
                          </div>
                          <div
                            className={`w-7 h-7 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-600 text-xs transition-transform ${
                              abiertoArt ? 'rotate-180 bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {abiertoArt && (
                        <div className="divide-y divide-slate-100 p-2 space-y-2">
                          {art.colores.map((col, idxColor) =>
                            renderTarjetaVarianteColor(col, idxColor, false)
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            ))
          )}
        </main>

        {/* BARRA PERSISTENTE INFERIOR (SOLO MÓVIL) */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-8px_25px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div
              onClick={() => {
                if (totalRollos > 0) setIsCarritoOpen(true);
              }}
              className="leading-tight cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wide">
                <span className="text-slate-800">
                  {totalRollos} {totalRollos === 1 ? 'rollo' : 'rollos'}
                </span>
                <span>·</span>
                <span className="text-blue-700 font-black font-mono">
                  {totalMetros.toFixed(2)} m
                </span>
              </div>
              <div className="text-xl font-black text-[#0B2144] flex items-baseline gap-1 font-mono">
                <span className="text-xs font-bold text-slate-500 font-sans">S/</span>
                <span>
                  {totalSoles.toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={totalRollos === 0}
              onClick={() => setIsCarritoOpen(true)}
              className={`flex-1 py-3.5 px-4 font-black rounded-2xl flex items-center justify-center gap-2 text-xs transition ${
                totalRollos > 0
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-500/25 cursor-pointer'
                  : 'bg-slate-300 text-slate-500 shadow-2xs cursor-not-allowed'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{totalRollos > 0 ? `Ver Carrito (${totalRollos})` : 'Selecciona Rollos'}</span>
            </button>
          </div>
        </footer>
      </div>

      {/* ========================================================================
          VISTA 2: MODO COMPUTADORA / ESCRITORIO (lg:block) — Pantalla amplia a 2 paneles
          ======================================================================== */}
      <div className="hidden lg:block space-y-6 print:hidden">
        {/* Cabecera Amplia de Escritorio */}
        <div className="bg-[#0B2144] text-white rounded-3xl p-5 shadow-md border border-blue-900/50 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-md border border-white/20">
              8t
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-widest text-white">
                  PUNTO DE VENTA (POS) & ARMADO DE PEDIDOS
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                  ROLPICKING EN VIVO
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium mt-0.5">
                PERÚ | Donde nacen las futuras tendencias · Selecciona rollos a la izquierda y confirma la orden a la derecha
              </p>
            </div>
          </div>

          {/* Buscador Amplio en Cabecera Desktop */}
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleBuscadorSubmit} className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Buscar por artículo, color, cód. color, rollo (ROL-...), metros o lote..."
                className="w-full bg-[#071833] text-white placeholder-slate-400 rounded-2xl pl-11 pr-10 py-3 text-sm font-semibold border border-blue-800/80 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
              />
              {busquedaTexto && (
                <button
                  type="button"
                  onClick={() => setBusquedaTexto('')}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>

          {/* Filtros de Línea + Botón Pedidos Pendientes */}
          <div className="flex items-center gap-2 shrink-0">
            {lineasDisponibles.length > 1 && (
              <div className="flex items-center gap-1.5 bg-[#071833] p-1.5 rounded-2xl border border-blue-800/70">
                <button
                  type="button"
                  onClick={() => setLineaFiltro('TODAS')}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs whitespace-nowrap transition cursor-pointer ${
                    lineaFiltro === 'TODAS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Todas las Líneas
                </button>
                {lineasDisponibles.map((linea) => {
                  const activa = lineaFiltro.toLowerCase() === linea.toLowerCase();
                  return (
                    <button
                      key={linea}
                      type="button"
                      onClick={() => setLineaFiltro(linea)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                        activa
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {linea}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={onIrAPedidosPendientes}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-blue-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Pedidos Pendientes</span>
            </button>
          </div>
        </div>

        {/* Grilla Amplia de 12 Columnas: Catálogo (8 cols) + Pasarela de Pedido Fija (4 cols) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA (8 COLUMNAS): Catálogo Jerárquico en Grilla de 2 Columnas */}
          <div className="col-span-8 space-y-5">
            {catalogoFiltrado.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-2 border border-slate-200 shadow-2xs">
                <Search className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">
                  No encontramos telas o rollos con ese criterio de búsqueda.
                </p>
              </div>
            ) : (
              catalogoFiltrado.map((grupoLinea) => (
                <section key={grupoLinea.linea} className="space-y-3">
                  {/* Encabezado de Línea Único */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
                        Línea: {grupoLinea.linea}
                      </h2>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {grupoLinea.articulos.length}{' '}
                      {grupoLinea.articulos.length === 1 ? 'artículo agrupado' : 'artículos agrupados'}
                    </span>
                  </div>

                  {grupoLinea.articulos.map((art) => {
                    const abiertoArt = articulosAbiertos[art.codigoArticulo] ?? true;
                    let metrosTotalesArt = 0;
                    let rollosTotalesArt = 0;
                    art.colores.forEach((c) => {
                      metrosTotalesArt += c.rollos.reduce((acc, r) => acc + Number(r.metraje), 0);
                      rollosTotalesArt += c.rollos.length;
                    });

                    return (
                      <article
                        key={`${grupoLinea.linea}_${art.codigoArticulo}`}
                        className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition"
                      >
                        {/* Cabecera del Artículo */}
                        <div
                          onClick={() => toggleArticulo(art.codigoArticulo)}
                          className="px-5 py-4 bg-slate-50/90 hover:bg-slate-100 cursor-pointer flex items-center justify-between gap-4 border-b border-slate-200/80"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-3.5 h-10 rounded-2xl bg-blue-100 text-blue-800 font-mono text-sm font-black flex items-center justify-center shrink-0 border border-blue-200">
                              {art.codigoArticulo}
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-base font-black text-slate-900 truncate">
                                {art.nombreBase}
                              </h3>
                              <p className="text-xs text-slate-500 font-semibold">
                                {art.colores.length} variantes de color en catálogo · Línea{' '}
                                {grupoLinea.linea}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="text-base font-black text-slate-900 font-mono">
                                {metrosTotalesArt.toFixed(2)}{' '}
                                <span className="text-xs text-blue-600 font-bold font-sans">m</span>
                              </span>
                              <div className="text-xs font-bold text-slate-500 flex items-center justify-end gap-1">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                <span>
                                  {rollosTotalesArt} {rollosTotalesArt === 1 ? 'rollo disponible' : 'rollos disponibles'}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`w-8 h-8 rounded-xl bg-slate-200/70 flex items-center justify-center text-slate-600 transition-transform ${
                                abiertoArt ? 'rotate-180 bg-blue-50 text-blue-700' : ''
                              }`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Grilla de 2 Columnas de Variantes de Color en Escritorio */}
                        {abiertoArt && (
                          <div className="p-4 grid grid-cols-2 gap-3.5 bg-slate-50/40">
                            {art.colores.map((col, idxColor) =>
                              renderTarjetaVarianteColor(col, idxColor, true)
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))
            )}
          </div>

          {/* COLUMNA DERECHA (4 COLUMNAS FIJAS): Cliente, Condición de Pago y Pasarela de Pedido */}
          <div className="col-span-4 sticky top-20 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden">
              {/* Cabecera del Panel Derecho */}
              <div className="bg-[#0B2144] text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 block">
                    PASARELA DE PEDIDO
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Cliente, Condición y Rollos ({totalRollos})
                  </h3>
                </div>
                <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full font-mono">
                  {totalMetros.toFixed(2)} m
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* 1. Selector de Cliente en PC */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>1. Cliente Asignado</span>
                    </span>
                    {onIrAClientes && (
                      <button
                        type="button"
                        onClick={onIrAClientes}
                        className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>+ Nuevo Cliente</span>
                      </button>
                    )}
                  </div>

                  {clientes.length > 0 && (
                    <select
                      value={selectedClienteId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedClienteId(id);
                        const found = clientes.find((c) => c.id === id);
                        if (found) {
                          setClienteNombre(found.razon_social);
                          setClienteRuc(found.ruc);
                          setClienteTelefono(found.telefonos || '');
                          setClienteCorreo(found.correos || '');
                          setClienteDireccion(found.direccion || '');
                        }
                      }}
                      className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- Elegir de la cartera ({clientes.length}) --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razon_social} — RUC: {c.ruc}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Razón Social o Nombre del Cliente *"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={clienteRuc}
                        onChange={(e) => setClienteRuc(e.target.value)}
                        placeholder="RUC / DNI"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                        placeholder="Teléfono"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Condición Contado / Crédito y Letras */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCondicionPago('CONTADO')}
                      className={`py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        condicionPago === 'CONTADO'
                          ? 'font-black bg-emerald-600 text-white shadow-xs'
                          : 'font-bold bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Contado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCondicionPago('CREDITO')}
                      className={`py-2.5 rounded-xl text-xs text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        condicionPago === 'CREDITO'
                          ? 'font-black bg-amber-600 text-white shadow-xs'
                          : 'font-bold bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <CalendarCheck className="w-4 h-4" />
                      <span>Crédito</span>
                    </button>
                  </div>

                  {condicionPago === 'CREDITO' && (
                    <div className="bg-amber-50/90 p-3 rounded-2xl border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-amber-950">Plazo en Letras:</span>
                        <span className="font-black text-amber-800 text-[11px] font-mono">
                          {labelLetrasMap[numeroLetras]}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        {([1, 2, 3, 4] as const).map((cant) => (
                          <button
                            key={cant}
                            type="button"
                            onClick={() => setNumeroLetras(cant)}
                            className={`py-1.5 rounded-xl text-[11px] text-center transition cursor-pointer ${
                              numeroLetras === cant
                                ? 'font-black bg-amber-600 text-white shadow-xs'
                                : 'font-bold bg-white border border-amber-300 text-amber-900'
                            }`}
                          >
                            {cant}L ({cant * 30}d)
                          </button>
                        ))}
                      </div>
                      <div className="text-[11px] text-amber-900 font-semibold flex items-center justify-between pt-1 border-t border-amber-200/70">
                        <span>Cuota estimada:</span>
                        <strong className="font-black font-mono text-xs text-amber-950">
                          S/ {montoPorLetra.toFixed(2)} / letra
                        </strong>
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-xl border transition ${
                      !requiereAprobacionJefeVentas
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    {!requiereAprobacionJefeVentas ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    )}
                    <span>
                      {condicionPago === 'CONTADO'
                        ? 'Venta al Contado: Pasa directo a Créditos / Facturación'
                        : !algunPrecioRebajado
                        ? 'Precios oficiales respetados: Pasa directo a Créditos'
                        : 'Requiere aprobación de Jefatura de Ventas (Crédito con rebaja)'}
                    </span>
                  </div>
                </div>

                {/* 3. Lista de Rollos Seleccionados en el Pedido */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                      Rollos en el Pedido ({totalRollos})
                    </span>
                    {totalRollos > 0 && (
                      <button
                        type="button"
                        onClick={() => setRollosSeleccionadosIds([])}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Vaciar
                      </button>
                    )}
                  </div>

                  {gruposEnCarrito.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-400">
                      Haz clic en <strong>"+ Marcar"</strong> sobre cualquier rollo disponible a la izquierda para agregarlo al pedido.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                      {gruposEnCarrito.map((grupo) => (
                        <div
                          key={grupo.tela.id}
                          className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-slate-900 text-xs leading-tight">
                                {grupo.tela.codigo} · {grupo.tela.nombre}
                              </h4>
                              <p className="text-[11px] font-bold text-blue-700">
                                Cód. {grupo.tela.codigo_color} · {grupo.tela.color}
                              </p>
                            </div>

                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <span className="font-black text-slate-600 text-xs">S/</span>
                                <input
                                  type="number"
                                  step="0.10"
                                  min="0.10"
                                  value={grupo.precioNegociado}
                                  onChange={(e) =>
                                    actualizarPrecioColor(grupo.tela, e.target.value)
                                  }
                                  className="w-16 text-right font-black text-xs bg-white border border-blue-400 rounded-lg py-0.5 px-1 font-mono"
                                />
                                <span className="text-[10px] text-slate-400 font-bold">/m</span>
                              </div>
                              <div className="font-black text-slate-900 text-xs mt-0.5 font-mono">
                                S/ {grupo.subtotalSoles.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-slate-200/80">
                            {grupo.rollos.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-100"
                              >
                                <span className="font-mono font-bold text-slate-700">
                                  {r.codigo_rollo}
                                </span>
                                <span className="font-bold font-mono">
                                  {r.metraje.toFixed(2)} m
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRollosSeleccionadosIds((prev) =>
                                      prev.filter((id) => id !== r.id)
                                    )
                                  }
                                  className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                                  title="Quitar del pedido"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Resumen e Importe Total */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/90 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Rollos Físicos Totales:</span>
                    <strong className="text-slate-900 font-black font-mono">
                      {totalRollos} rollos
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Metraje Total Exacto:</span>
                    <strong className="text-blue-800 font-black font-mono">
                      {totalMetros.toFixed(2)} m
                    </strong>
                  </div>
                  <div className="flex justify-between items-baseline text-sm font-black text-[#0B2144] pt-2 border-t border-blue-200">
                    <span>Importe Total:</span>
                    <span className="text-xl text-blue-900 font-mono">
                      S/{' '}
                      {totalSoles.toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* 5. Botones de Acción y Confirmación */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={totalRollos === 0}
                      onClick={() => enviarPorWhatsApp()}
                      className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      disabled={totalRollos === 0}
                      onClick={enviarPorCorreo}
                      className="py-2 px-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Correo</span>
                    </button>
                    <button
                      type="button"
                      disabled={totalRollos === 0}
                      onClick={imprimirPedido}
                      className="py-2 px-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={totalRollos === 0}
                    onClick={confirmarOrdenDesdeCarrito}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-40 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar y Registrar Pedido ({totalRollos})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= PASARELA DEL CARRITO MÓVIL (BOTTOM SHEET) ================= */}
      {isCarritoOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-150 print:hidden"
          onClick={() => setIsCarritoOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border-t sm:border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pb-2 border-b border-slate-100 shrink-0">
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-widest text-[#0B2144]">8TEX</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                      PASARELA DE PEDIDO
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    Resumen y Desglose de Rollos
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCarritoOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center active:scale-90 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-500 gap-2">
                  <span>Cliente:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCarritoOpen(false);
                      setIsModalClientesOpen(true);
                    }}
                    className="text-slate-900 font-bold truncate max-w-[220px] hover:text-blue-700 underline cursor-pointer"
                  >
                    {clienteNombre}
                  </button>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>RUC:</span>
                  <span className="font-mono text-slate-700 font-semibold">{clienteRuc}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                  <span className="font-bold text-slate-600">Condición:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                      condicionPago === 'CONTADO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {condicionPago === 'CONTADO'
                      ? 'CONTADO'
                      : `CRÉDITO (${numeroLetras} LETRAS)`}
                  </span>
                </div>
                {condicionPago === 'CREDITO' && (
                  <div className="flex justify-between items-center text-amber-900 font-medium pt-1 border-t border-slate-200">
                    <span>Plan de Letras:</span>
                    <strong className="font-mono text-xs">
                      {numeroLetras} letras de S/ {montoPorLetra.toFixed(2)} c/u
                    </strong>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                {gruposEnCarrito.map((grupo) => (
                  <div
                    key={grupo.tela.id}
                    className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                          {grupo.tela.codigo} · {grupo.tela.linea || 'General'}
                        </span>
                        <h4 className="font-black text-slate-900 text-xs leading-tight">
                          {grupo.tela.nombre}
                        </h4>
                        <p className="text-[11px] font-bold text-blue-700">
                          {grupo.tela.codigo_color} · {grupo.tela.color}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="font-black text-slate-600 text-xs">S/</span>
                          <input
                            type="number"
                            step="0.10"
                            min="0.10"
                            value={grupo.precioNegociado}
                            onChange={(e) => actualizarPrecioColor(grupo.tela, e.target.value)}
                            className="w-16 text-right font-black text-xs bg-white border border-blue-400 rounded-lg py-1 px-1 focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">/m</span>
                        </div>
                        <div className="font-black text-slate-900 text-sm mt-1 font-mono">
                          S/ {grupo.subtotalSoles.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-slate-200/80">
                      {grupo.rollos.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-[11px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100"
                        >
                          <span className="font-mono font-bold text-slate-700">
                            {r.codigo_rollo}
                          </span>
                          <span className="font-bold font-mono">{r.metraje.toFixed(2)} m</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRollosSeleccionadosIds((prev) => {
                                const next = prev.filter((id) => id !== r.id);
                                if (next.length === 0) setIsCarritoOpen(false);
                                return next;
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                            title="Retirar rollo del carrito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Rollos Físicos Totales:</span>
                  <strong className="text-slate-800 font-black">{totalRollos} rollos</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Metraje Total Exacto:</span>
                  <strong className="text-blue-800 font-black font-mono">
                    {totalMetros.toFixed(2)} m
                  </strong>
                </div>
                <div className="flex justify-between text-sm font-black text-[#0B2144] pt-2 border-t border-slate-200">
                  <span>Importe Total:</span>
                  <span className="text-lg text-blue-900 font-mono">
                    S/ {totalSoles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-3 space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  Acciones Inmediatas de Cierre
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => enviarPorWhatsApp()}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={enviarPorCorreo}
                    className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Mail className="w-5 h-5" />
                    <span>Por Correo</span>
                  </button>

                  <button
                    type="button"
                    onClick={imprimirPedido}
                    className="py-2.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-5 h-5" />
                    <span>Imprimir</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={confirmarOrdenDesdeCarrito}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Registrar Pedido</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SELECTOR DE CLIENTE ================= */}
      {isModalClientesOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-150 print:hidden"
          onClick={() => setIsModalClientesOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Elegir Cliente de Cartera</h3>
                <p className="text-[11px] text-slate-500">
                  Selecciona un cliente registrado o edita los datos abajo
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {onIrAClientes && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalClientesOpen(false);
                      onIrAClientes();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Nuevo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalClientesOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center active:scale-90 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busquedaClienteModal}
                onChange={(e) => setBusquedaClienteModal(e.target.value)}
                placeholder="Buscar por RUC, Razón Social o Contacto..."
                className="w-full bg-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="overflow-y-auto space-y-1.5 flex-1 divide-y divide-slate-100 max-h-56">
              {clientesFiltradosModal.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No se encontraron clientes en la cartera.
                </div>
              ) : (
                clientesFiltradosModal.map((c) => {
                  const isSelected = c.id === selectedClienteId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => seleccionarClienteDeCartera(c)}
                      className={`w-full text-left p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between active:bg-blue-50 transition cursor-pointer ${
                        isSelected ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-black text-slate-800 truncate">
                          {c.razon_social}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          RUC: {c.ruc}
                          {c.nombre_contacto ? ` · ${c.nombre_contacto}` : ''}
                        </div>
                      </div>
                      <Check
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-blue-600' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Datos del Cliente Activo
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Razón Social / Cliente"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={clienteRuc}
                  onChange={(e) => setClienteRuc(e.target.value)}
                  placeholder="RUC o DNI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsModalClientesOpen(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs cursor-pointer"
              >
                Usar este Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PANTALLA COMPLETA DE ÉXITO ================= */}
      {pedidoExitoso && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150 print:hidden">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Pedido Generado
                </span>
                <h2 className="text-lg font-black text-[#0B2144] mt-0.5 font-mono">
                  {pedidoExitoso.pedido.codigo_pedido}
                </h2>
                <p
                  className={`text-xs font-bold ${
                    pedidoExitoso.requiereAutorizacionJefe
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {pedidoExitoso.requiereAutorizacionJefe
                    ? 'Enviado a Jefatura de Ventas para Autorización'
                    : 'Aprobado · Pasa directo a Créditos'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>Cliente:</span>
                <strong className="text-slate-800 text-right truncate max-w-[180px]">
                  {pedidoExitoso.pedido.cliente_nombre}
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Condición:</span>
                <strong className="text-slate-800 font-bold">
                  {pedidoExitoso.condicion === 'CREDITO'
                    ? `Crédito (${pedidoExitoso.letras} letras)`
                    : 'Contado'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Rollos Físicos:</span>
                <strong className="text-slate-800">
                  {pedidoExitoso.pedido.total_rollos} rollos
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Metraje Exacto:</span>
                <strong className="text-blue-800 font-bold font-mono">
                  {pedidoExitoso.pedido.total_metros.toFixed(2)} m
                </strong>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-black text-[#0B2144]">
                <span>Total Orden:</span>
                <span className="font-mono">
                  S/{' '}
                  {pedidoExitoso.pedido.total_importe.toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => enviarPorWhatsApp(pedidoExitoso.pedido.codigo_pedido)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Compartir por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onIrAPedidosPendientes}
                className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black rounded-2xl text-xs transition cursor-pointer"
              >
                Ver en Pedidos Pendientes
              </button>

              <button
                type="button"
                onClick={iniciarNuevoPedidoCalle}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs transition cursor-pointer"
              >
                Tomar Otro Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= COMPROBANTE DE IMPRESIÓN (MEMBRETADO OFICIAL 8TEX) ================= */}
      <div className="hidden print:block bg-white text-slate-900 p-8 font-sans">
        <div className="border-b-2 border-blue-900 pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-blue-900 tracking-wider">8TEX</h1>
            <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
              PERÚ | Donde nacen las futuras tendencias
            </p>
            <p className="text-xs font-bold text-slate-800 mt-1">
              TEXTILES OCHO LUKAL E.I.R.L.
            </p>
            <p className="text-[10px] text-slate-600">
              RUC: 20608912345 · Venta Mayorista Textil · Lima, Perú
            </p>
          </div>
          <div className="border-2 border-blue-900 p-3 rounded-lg text-center">
            <p className="text-xs font-black text-slate-800">ORDEN DE PEDIDO (CALLE)</p>
            <p className="text-sm font-black text-blue-900 font-mono">
              {pedidoExitoso?.pedido.codigo_pedido ||
                `PED-${new Date().getFullYear()}-PRELIMINAR`}
            </p>
            <p className="text-[10px] text-slate-500">
              {new Date().toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded border border-slate-200 mb-4">
          <div>
            <p>
              <strong>Cliente:</strong> {clienteNombre}
            </p>
            <p>
              <strong>RUC / DNI:</strong> {clienteRuc}
            </p>
          </div>
          <div>
            <p>
              <strong>Condición de Pago:</strong> {condicionPago}
            </p>
            {condicionPago === 'CREDITO' && (
              <p>
                <strong>Financiamiento:</strong> {numeroLetras} letras ({numeroLetras * 30} días)
              </p>
            )}
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse mb-4">
          <thead>
            <tr className="bg-blue-900 text-white font-bold">
              <th className="p-2 border">Código Rollo</th>
              <th className="p-2 border">Línea / Artículo & Color</th>
              <th className="p-2 border text-right">Metros</th>
              <th className="p-2 border text-right">P. Metro (S/)</th>
              <th className="p-2 border text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rollosSeleccionadosDetalle.map((item) => (
              <tr key={item.rollo.id} className="border-b text-xs">
                <td className="p-2 border font-mono font-bold">{item.rollo.codigo_rollo}</td>
                <td className="p-2 border">
                  {item.tela.codigo} · {item.tela.nombre} ({item.tela.color})
                </td>
                <td className="p-2 border text-right font-bold">
                  {item.rollo.metraje.toFixed(2)} m
                </td>
                <td className="p-2 border text-right">S/ {item.precioNegociado.toFixed(2)}</td>
                <td className="p-2 border text-right font-black">
                  S/ {item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start text-xs border-t pt-3">
          <div className="text-[10px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">
              Cuentas Corrientes Oficiales Textiles Ocho Lukal:
            </p>
            <p>• BCP Soles: 191-8849201-0-45 (CCI: 002-191-008849201045-88)</p>
            <p>• BBVA Soles: 0011-0482-0100084921 (CCI: 011-482-000100084921-23)</p>
          </div>
          <div className="w-60 space-y-1 text-right">
            <p className="text-xs">
              Total Rollos Físicos: <strong>{totalRollos}</strong>
            </p>
            <p className="text-xs">
              Total Metros Exactos: <strong>{totalMetros.toFixed(2)} m</strong>
            </p>
            <p className="text-base font-black text-blue-900 pt-1.5 border-t">
              TOTAL A PAGAR: S/{' '}
              {totalSoles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* ================= NOTIFICACIÓN TOAST RÁPIDA ================= */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0B2144] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-blue-400/40 flex items-center gap-2 text-xs font-bold animate-in fade-in duration-150 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
