import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, RefreshCw, AlertTriangle, Copy, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import PedidoSinIdentificar from "@/components/equipacion/PedidoSinIdentificar";
import JugadoresPedidoLista from "@/components/equipacion/JugadoresPedidoLista";

export default function PedidosEquipacion() {
  const qc = useQueryClient();
  const [filtroCat, setFiltroCat] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidosEquipacion"],
    queryFn: () => base44.entities.PedidoEquipacion.list("-fecha_pedido", 500),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["playersEquipacion"],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
  });
  const { data: recordatorios = [] } = useQuery({
    queryKey: ["recordatoriosEquipacion"],
    queryFn: () => base44.entities.RecordatorioEquipacion.list("-created_date", 500),
  });

  const [enviandoId, setEnviandoId] = useState(null);

  const ultimosPorJugador = useMemo(() => {
    const map = {};
    recordatorios.forEach((r) => { if (!map[r.jugador_id]) map[r.jugador_id] = r; });
    return map;
  }, [recordatorios]);

  const enviarEmail = useMutation({
    mutationFn: (player) => base44.functions.invoke("recordatorioEquipacionJugador", {
      jugador_id: player.id,
      appUrl: window.location.origin,
    }),
    onSuccess: () => {
      toast.success("Recordatorio enviado por email");
      qc.invalidateQueries({ queryKey: ["recordatoriosEquipacion"] });
    },
    onError: (e) => toast.error(e.message || "No se pudo enviar el correo"),
    onSettled: () => setEnviandoId(null),
  });

  const abrirWhatsApp = async (player) => {
    const tel = String(player.telefono || player.telefono_tutor_2 || "").replace(/\D/g, "");
    const destino = tel.startsWith("34") ? tel : `34${tel}`;
    const mensaje =
      `👕 *Pedido de equipación pendiente*\n\n` +
      `Hola, nos consta que aún no se ha hecho el pedido de equipación de *${player.nombre}*.\n\n` +
      `Hazlo desde la *app del club* (Tienda → Equipación): allí verás el dorsal asignado y el enlace correcto a la tienda.\n\n` +
      `Si ya lo has hecho, avísanos y lo revisamos. ¡Gracias! 🙌`;
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`, "_blank");
    await base44.entities.RecordatorioEquipacion.create({
      jugador_id: player.id,
      jugador_nombre: player.nombre,
      canal: "whatsapp",
      destinatario: destino,
      fecha: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["recordatoriosEquipacion"] });
  };

  const marcarManual = useMutation({
    mutationFn: (player) => base44.entities.PedidoEquipacion.create({
      gmail_message_id: `manual-${player.id}-${Date.now()}`,
      numero_pedido: "MANUAL",
      fecha_pedido: new Date().toISOString(),
      asunto: "Pedido marcado manualmente por el club",
      jugador_id: player.id,
      jugador_nombre: player.nombre,
      jugadores: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
      metodo_match: "manual",
    }),
    onSuccess: () => {
      toast.success("Jugador marcado como que ya ha pedido");
      qc.invalidateQueries({ queryKey: ["pedidosEquipacion"] });
    },
    onError: (e) => toast.error(e.message || "No se pudo marcar"),
  });

  const desmarcarManual = useMutation({
    mutationFn: (pedido) => base44.entities.PedidoEquipacion.delete(pedido.id),
    onSuccess: () => {
      toast.success("Marca manual eliminada");
      qc.invalidateQueries({ queryKey: ["pedidosEquipacion"] });
    },
    onError: (e) => toast.error(e.message || "No se pudo deshacer"),
  });

  const sync = useMutation({
    mutationFn: () => base44.functions.invoke("importarPedidosEquipacion", { max: 200 }),
    onSuccess: (res) => {
      const d = res.data || {};
      toast.success(`${d.nuevos || 0} pedidos nuevos · ${d.identificados || 0} identificados`);
      qc.invalidateQueries({ queryKey: ["pedidosEquipacion"] });
    },
    onError: (e) => toast.error(e.message || "Error al leer el correo"),
  });

  const asignar = useMutation({
    mutationFn: async ({ pedido, jugadorIds }) => {
      const seleccion = jugadorIds
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({ jugador_id: p.id, jugador_nombre: p.nombre }));
      return base44.entities.PedidoEquipacion.update(pedido.id, {
        jugador_id: seleccion[0]?.jugador_id || "",
        jugador_nombre: seleccion[0]?.jugador_nombre || "",
        jugadores: seleccion,
        metodo_match: "manual",
      });
    },
    onSuccess: () => {
      toast.success("Pedido asignado");
      qc.invalidateQueries({ queryKey: ["pedidosEquipacion"] });
    },
  });

  const pedidosPorJugador = useMemo(() => {
    const map = {};
    pedidos.forEach((p) => {
      const ids = (p.jugadores || []).map((j) => j.jugador_id).filter(Boolean);
      if (!ids.length && p.jugador_id) ids.push(p.jugador_id);
      ids.forEach((id) => { map[id] = [...(map[id] || []), p]; });
    });
    return map;
  }, [pedidos]);

  const sinIdentificar = pedidos.filter((p) => !p.jugador_id);
  const categorias = useMemo(
    () => [...new Set(players.map((p) => p.categoria_principal || p.deporte).filter(Boolean))].sort(),
    [players]
  );

  // Este año todos piden equipación; en temporadas siguientes basta con mirar
  // los que entran nuevos (los renovados ya tienen equipación).
  const jugadoresBase = useMemo(() => {
    if (filtroTipo === "nuevos") return players.filter((p) => p.tipo_inscripcion === "Nueva Inscripción");
    if (filtroTipo === "renovaciones") return players.filter((p) => p.tipo_inscripcion === "Renovación");
    return players;
  }, [players, filtroTipo]);

  const jugadoresFiltrados = useMemo(() => {
    return jugadoresBase
      .filter((p) => filtroCat === "todas" || (p.categoria_principal || p.deporte) === filtroCat)
      .filter((p) => !busqueda || (p.nombre || "").toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [jugadoresBase, filtroCat, busqueda]);

  const conPedido = jugadoresBase.filter((p) => pedidosPorJugador[p.id]).length;
  const faltan = jugadoresFiltrados.filter((p) => !pedidosPorJugador[p.id]);

  const copiarFaltan = () => {
    navigator.clipboard.writeText(faltan.map((p) => `${p.nombre} — ${p.email_padre || ""}`).join("\n"));
    toast.success("Lista copiada (con emails)");
  };

  // WhatsApp solo convierte los teléfonos en enlaces pulsables si van en
  // formato internacional (+34 XXX XXX XXX), así que los normalizamos.
  const formatearTelefono = (tel) => {
    if (!tel) return "sin teléfono";
    const digitos = String(tel).replace(/\D/g, "");
    const nacional = digitos.startsWith("34") && digitos.length === 11 ? digitos.slice(2) : digitos;
    if (nacional.length !== 9) return `+${digitos}`;
    return `+34 ${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}`;
  };

  const construirTexto = (conTelefono) => {
    const porCategoria = {};
    faltan.forEach((p) => {
      const cat = p.categoria_principal || p.deporte || "Sin categoría";
      const tel = formatearTelefono(p.telefono || p.telefono_tutor_2);
      porCategoria[cat] = [...(porCategoria[cat] || []), conTelefono ? `${p.nombre} — ${tel}` : p.nombre];
    });
    const bloques = Object.keys(porCategoria)
      .sort()
      .map((cat) => `*${cat}*\n${porCategoria[cat].map((n) => `• ${n}`).join("\n")}`)
      .join("\n\n");
    return (
      `👕 *EQUIPACIÓN — PEDIDOS PENDIENTES*\n` +
      `_CD Bustarviejo_\n\n` +
      `Estos jugadores aún *no han hecho el pedido* de equipación:\n\n` +
      `${bloques}\n\n` +
      `Total pendientes: *${faltan.length}*\n` +
      `Si ya lo has hecho, avísanos y lo revisamos. ¡Gracias! 🙌`
    );
  };

  const copiarSoloNombres = () => {
    navigator.clipboard.writeText(construirTexto(false));
    toast.success("Nombres copiados, ya puedes pegarlo en WhatsApp");
  };

  const copiarConTelefonos = () => {
    navigator.clipboard.writeText(construirTexto(true));
    toast.success("Lista con teléfonos copiada");
  };

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-28 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
              <Shirt className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Equipación oficial</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Pedidos de equipación</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Controla los pedidos recibidos, identifica a cada jugador y localiza rápidamente quién tiene pendiente la equipación.</p>
            </div>
          </div>
          <Button onClick={() => sync.mutate()} disabled={sync.isPending} size="sm" className="w-full shrink-0 bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
            Sincronizar pedidos
          </Button>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="p-4 text-center sm:p-5">
          <p className="text-2xl font-extrabold tracking-tight text-emerald-600 sm:text-3xl">{conPedido}</p>
          <p className="text-xs text-slate-500">Han pedido</p>
        </CardContent></Card>
        <Card className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="p-4 text-center sm:p-5">
          <p className="text-2xl font-extrabold tracking-tight text-slate-700 sm:text-3xl">{jugadoresBase.length - conPedido}</p>
          <p className="text-xs text-slate-500">Sin pedido</p>
        </CardContent></Card>
        <Card className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="p-4 text-center sm:p-5">
          <p className="text-2xl font-extrabold tracking-tight text-orange-600 sm:text-3xl">{sinIdentificar.length}</p>
          <p className="text-xs text-slate-500">Sin identificar</p>
        </CardContent></Card>
      </div>

      {sinIdentificar.length > 0 && (
        <Card className="min-w-0 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
          <CardHeader className="border-b border-orange-100 bg-orange-50/70 p-4 sm:p-5">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Pedidos sin identificar ({sinIdentificar.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sinIdentificar.map((p) => (
              <PedidoSinIdentificar
                key={p.id}
                pedido={p}
                players={players}
                onAssign={(pedido, jugadorIds) => asignar.mutate({ pedido, jugadorIds })}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-5">
          <CardTitle className="text-base font-bold text-slate-900 sm:text-lg">Seguimiento por jugador</CardTitle>
          <p className="text-sm text-slate-500">Busca, filtra y contacta a las familias con el pedido pendiente.</p>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 p-4 sm:p-5">
          <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <Input placeholder="Buscar jugador..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <Select value={filtroCat} onValueChange={setFiltroCat}>
              <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los jugadores</SelectItem>
                <SelectItem value="nuevos">Solo nuevas inscripciones</SelectItem>
                <SelectItem value="renovaciones">Solo renovaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {faltan.length > 0 && (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button size="sm" onClick={copiarSoloNombres} className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="w-4 h-4 mr-2" /> Copiar solo nombres ({faltan.length}) para WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={copiarConTelefonos}>
                <Phone className="w-4 h-4 mr-2" /> Copiar con teléfonos
              </Button>
              <Button variant="outline" size="sm" onClick={copiarFaltan}>
                <Copy className="w-4 h-4 mr-2" /> Copiar con emails
              </Button>
            </div>
          )}
          <JugadoresPedidoLista
            players={jugadoresFiltrados}
            pedidosPorJugador={pedidosPorJugador}
            ultimosPorJugador={ultimosPorJugador}
            enviandoId={enviarEmail.isPending ? enviandoId : null}
            onEmail={(p) => { setEnviandoId(p.id); enviarEmail.mutate(p); }}
            onWhatsApp={abrirWhatsApp}
            onMarcarManual={(p) => marcarManual.mutate(p)}
            onDesmarcarManual={(pedido) => desmarcarManual.mutate(pedido)}
          />
        </CardContent>
      </Card>
    </div>
  );
}