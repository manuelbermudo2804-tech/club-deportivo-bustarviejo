import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, RefreshCw, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import PedidoSinIdentificar from "@/components/equipacion/PedidoSinIdentificar";
import JugadoresPedidoLista from "@/components/equipacion/JugadoresPedidoLista";

export default function PedidosEquipacion() {
  const qc = useQueryClient();
  const [filtroCat, setFiltroCat] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidosEquipacion"],
    queryFn: () => base44.entities.PedidoEquipacion.list("-fecha_pedido", 500),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["playersEquipacion"],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
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
    mutationFn: async ({ pedido, jugadorId }) => {
      const jugador = players.find((p) => p.id === jugadorId);
      return base44.entities.PedidoEquipacion.update(pedido.id, {
        jugador_id: jugadorId,
        jugador_nombre: jugador?.nombre || "",
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
      if (!p.jugador_id) return;
      map[p.jugador_id] = [...(map[p.jugador_id] || []), p];
    });
    return map;
  }, [pedidos]);

  const sinIdentificar = pedidos.filter((p) => !p.jugador_id);
  const categorias = useMemo(
    () => [...new Set(players.map((p) => p.categoria_principal || p.deporte).filter(Boolean))].sort(),
    [players]
  );

  const jugadoresFiltrados = useMemo(() => {
    return players
      .filter((p) => filtroCat === "todas" || (p.categoria_principal || p.deporte) === filtroCat)
      .filter((p) => !busqueda || (p.nombre || "").toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [players, filtroCat, busqueda]);

  const conPedido = players.filter((p) => pedidosPorJugador[p.id]).length;
  const faltan = jugadoresFiltrados.filter((p) => !pedidosPorJugador[p.id]);

  const copiarFaltan = () => {
    navigator.clipboard.writeText(faltan.map((p) => `${p.nombre} — ${p.email_padre || ""}`).join("\n"));
    toast.success("Lista copiada");
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
          <p className="text-2xl font-bold text-slate-700">{players.length - conPedido}</p>
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
                onAssign={(pedido, jugadorId) => asignar.mutate({ pedido, jugadorId })}
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
          </div>
          {faltan.length > 0 && (
            <Button variant="outline" size="sm" onClick={copiarFaltan} className="w-full sm:w-auto">
              <Copy className="w-4 h-4 mr-2" /> Copiar los {faltan.length} que faltan
            </Button>
          )}
          <JugadoresPedidoLista players={jugadoresFiltrados} pedidosPorJugador={pedidosPorJugador} />
        </CardContent>
      </Card>
    </div>
  );
}