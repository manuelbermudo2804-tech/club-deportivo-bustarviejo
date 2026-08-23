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
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shirt className="w-6 h-6 text-orange-600" />
          <h1 className="text-xl lg:text-2xl font-bold">Pedidos de equipación</h1>
        </div>
        <Button onClick={() => sync.mutate()} disabled={sync.isPending} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${sync.isPending ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{conPedido}</p>
          <p className="text-xs text-slate-500">Han pedido</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{jugadoresBase.length - conPedido}</p>
          <p className="text-xs text-slate-500">Sin pedido</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{sinIdentificar.length}</p>
          <p className="text-xs text-slate-500">Sin identificar</p>
        </CardContent></Card>
      </div>

      {sinIdentificar.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Jugadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Buscar jugador..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <Select value={filtroCat} onValueChange={setFiltroCat}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los jugadores</SelectItem>
                <SelectItem value="nuevos">Solo nuevas inscripciones</SelectItem>
                <SelectItem value="renovaciones">Solo renovaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {faltan.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
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
          />
        </CardContent>
      </Card>
    </div>
  );
}