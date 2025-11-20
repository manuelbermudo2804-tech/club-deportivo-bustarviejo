import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clover, Plus, X } from "lucide-react";
import { toast } from "sonner";

const NUMERO_LOTERIA = "28720";
const PRECIO_POR_DECIMO = 20;

export default function ParentLottery() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [numDecimos, setNumDecimos] = useState(1);
  const [notas, setNotas] = useState("");
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: players = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['myLotteryOrders', user?.email],
    queryFn: async () => {
      const allOrders = await base44.entities.LotteryOrder.list('-created_date');
      return allOrders.filter(o => o.email_padre === user?.email);
    },
    enabled: !!user?.email,
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.LotteryOrder.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLotteryOrders'] });
      setShowForm(false);
      setSelectedPlayer("");
      setNumDecimos(1);
      setNotas("");
      toast.success("✅ Pedido de lotería registrado");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const player = players.find(p => p.id === selectedPlayer);
    if (!player) {
      toast.error("Selecciona un jugador");
      return;
    }

    const total = numDecimos * PRECIO_POR_DECIMO;

    createOrderMutation.mutate({
      jugador_id: player.id,
      jugador_nombre: player.nombre,
      jugador_categoria: player.deporte,
      email_padre: user.email,
      telefono: player.telefono,
      numero_decimos: numDecimos,
      precio_por_decimo: PRECIO_POR_DECIMO,
      total: total,
      estado: "Solicitado",
      pagado: false,
      temporada: new Date().getFullYear().toString(),
      notas: notas
    });
  };

  const statusColors = {
    "Solicitado": "bg-blue-100 text-blue-700",
    "Entregado": "bg-green-100 text-green-700",
    "Cancelado": "bg-red-100 text-red-700"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🍀 Lotería de Navidad</h1>
          <p className="text-slate-600 mt-1">Número del club: <strong className="text-orange-600">{NUMERO_LOTERIA}</strong></p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Pedir Lotería
        </Button>
      </div>

      <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-orange-900 flex items-center gap-2">
            <Clover className="w-5 h-5" />
            Información de la Lotería
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-700">
          <p>🎟️ <strong>Número:</strong> {NUMERO_LOTERIA}</p>
          <p>💰 <strong>Precio por décimo:</strong> {PRECIO_POR_DECIMO}€</p>
          <p>📅 <strong>Sorteo:</strong> 22 de Diciembre</p>
          <p>👨‍🏫 <strong>Entrega:</strong> Los entrenadores entregarán los décimos en los entrenamientos</p>
          <p>💳 <strong>Pago:</strong> Paga directamente al entrenador al recibir el décimo</p>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Solicitar Décimos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Jugador</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.nombre} - {player.deporte}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Número de Décimos</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={numDecimos}
                  onChange={(e) => setNumDecimos(parseInt(e.target.value) || 1)}
                />
                <p className="text-sm text-slate-600">
                  Total: <strong>{numDecimos * PRECIO_POR_DECIMO}€</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Alguna nota adicional..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                  Solicitar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>Mis Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Clover className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No has solicitado lotería todavía</p>
              <p className="text-sm text-slate-400 mt-2">Haz clic en "Pedir Lotería" para hacer tu pedido</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <Card key={order.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{order.jugador_nombre}</h3>
                        <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
                      </div>
                      <Badge className={statusColors[order.estado]}>
                        {order.estado}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <p>🎟️ <strong>Décimos:</strong> {order.numero_decimos}</p>
                      <p>💰 <strong>Total:</strong> {order.total}€</p>
                      <p>💳 <strong>Pagado:</strong> {order.pagado ? "✅ Sí" : "❌ No"}</p>
                      {order.estado === "Entregado" && order.fecha_entrega && (
                        <p>📅 <strong>Entregado:</strong> {new Date(order.fecha_entrega).toLocaleDateString('es-ES')}</p>
                      )}
                      {order.notas && (
                        <p className="text-slate-600">📝 {order.notas}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}