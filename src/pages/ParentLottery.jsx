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
import { Gift, Sparkles, Star, PartyPopper, AlertCircle, Upload, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const NUMERO_LOTERIA = "28720";

export default function ParentLottery() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [numDecimos, setNumDecimos] = useState(1);
  const [notas, setNotas] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [justificanteUrl, setJustificanteUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [user, setUser] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const coachCheck = currentUser.es_entrenador === true || currentUser.es_coordinador === true;
      setIsCoach(coachCheck);
      
      // Verificar si tiene hijos jugadores reales
      const allPlayers = await base44.entities.Player.list();
      const myPlayers = allPlayers.filter(p => 
        p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email
      );
      setHasPlayers(myPlayers.length > 0);
    };
    fetchUser();
  }, []);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const loteriaAbierta = seasonConfig?.loteria_navidad_abierta === true;
  const requierePagoAdelantado = seasonConfig?.loteria_requiere_pago_adelantado === true;
  const precioDecimo = seasonConfig?.precio_decimo_loteria || 22;

  const { data: players = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) &&
        p.activo !== false
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
    mutationFn: async (orderData) => {
      const order = await base44.entities.LotteryOrder.create(orderData);
      
      // Notificar al admin si las notificaciones están activas
      if (seasonConfig?.notificaciones_admin_email) {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo - Lotería",
            to: "cdbustarviejo@gmail.com",
            subject: `🍀 Nuevo Pedido de Lotería - ${orderData.jugador_nombre}`,
            body: `
              <h2>Nuevo Pedido de Lotería de Navidad</h2>
              <p><strong>Solicitante:</strong> ${orderData.jugador_nombre}</p>
              <p><strong>Categoría:</strong> ${orderData.jugador_categoria}</p>
              <p><strong>Email:</strong> ${orderData.email_padre}</p>
              <p><strong>Décimos:</strong> ${orderData.numero_decimos}</p>
              <p><strong>Total:</strong> ${orderData.total}€</p>
              ${orderData.justificante_url ? `<p><strong>Justificante:</strong> <a href="${orderData.justificante_url}">Ver</a></p>` : '<p><strong>Pago:</strong> Pendiente (al entrenador)</p>'}
              <hr>
              <p style="font-size: 12px; color: #666;">Registrado el ${new Date().toLocaleString('es-ES')}</p>
            `
          });
        } catch (error) {
          console.error("Error sending lottery order notification:", error);
        }
      }
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLotteryOrders'] });
      setShowForm(false);
      setSelectedPlayer("");
      setSelectedCategory("");
      setNumDecimos(1);
      setNotas("");
      setMetodoPago("Transferencia");
      setJustificanteUrl("");
      toast.success("✅ ¡Pedido registrado! Tu entrenador te entregará los décimos");
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setJustificanteUrl(response.file_url);
      toast.success("Justificante subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el justificante");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (requierePagoAdelantado && !justificanteUrl) {
      toast.error("Debes subir el justificante de pago");
      return;
    }
    
    const total = numDecimos * precioDecimo;

    // Si es entrenador sin hijos, usar categoría directamente
    if (isCoach && !hasPlayers) {
      if (!selectedCategory) {
        toast.error("Selecciona una categoría");
        return;
      }

      createOrderMutation.mutate({
        jugador_id: user.id,
        jugador_nombre: `Entrenador: ${user.full_name}`,
        jugador_categoria: selectedCategory,
        email_padre: user.email,
        telefono: user.telefono || "",
        numero_decimos: numDecimos,
        precio_por_decimo: precioDecimo,
        total: total,
        estado: "Solicitado",
        pagado: false,
        metodo_pago: requierePagoAdelantado ? metodoPago : null,
        justificante_url: justificanteUrl,
        temporada: new Date().getFullYear().toString(),
        notas: notas
      });
    } else {
      // Lógica normal para padres con jugadores
      const player = players.find(p => p.id === selectedPlayer);
      if (!player) {
        toast.error("Selecciona un jugador");
        return;
      }

      createOrderMutation.mutate({
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        jugador_categoria: player.deporte,
        email_padre: user.email,
        telefono: player.telefono,
        numero_decimos: numDecimos,
        precio_por_decimo: precioDecimo,
        total: total,
        estado: "Solicitado",
        pagado: false,
        metodo_pago: requierePagoAdelantado ? metodoPago : null,
        justificante_url: justificanteUrl,
        temporada: new Date().getFullYear().toString(),
        notas: notas
      });
    }
  };

  const statusColors = {
    "Solicitado": "bg-blue-100 text-blue-700 border-blue-200",
    "Entregado": "bg-green-100 text-green-700 border-green-200",
    "Cancelado": "bg-red-100 text-red-700 border-red-200"
  };

  const totalDecimos = orders.reduce((sum, o) => sum + (o.numero_decimos || 0), 0);
  const totalInvertido = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-green-900 to-red-950 p-4 lg:p-8">
      {/* Animated snowflakes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall text-white opacity-70"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              fontSize: `${10 + Math.random() * 20}px`
            }}
          >
            ❄️
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Header con animación */}
        <div className="text-center space-y-4 animate-bounce-slow">
          <div className="flex justify-center gap-3 text-6xl">
            <span className="animate-spin-slow">🎄</span>
            <span className="animate-pulse">🎅</span>
            <span className="animate-spin-slow">🎁</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white drop-shadow-2xl">
            🍀 Lotería de Navidad 🍀
          </h1>
          <div className="inline-block bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-red-900 px-8 py-4 rounded-3xl shadow-2xl animate-pulse border-4 border-yellow-500">
            <p className="text-3xl lg:text-5xl font-black">
              Número: {NUMERO_LOTERIA}
            </p>
          </div>
        </div>

        {!loteriaAbierta && (
          <Alert className="bg-red-800 border-red-600 border-4 shadow-2xl">
            <AlertCircle className="h-6 w-6 text-yellow-400" />
            <AlertDescription className="text-white text-lg">
              <strong>❄️ Los pedidos de lotería están cerrados actualmente.</strong>
              <br />
              Podrás consultar tus pedidos anteriores aquí.
            </AlertDescription>
          </Alert>
        )}

        {/* Info Card con tema navideño */}
        <Card className="border-4 border-yellow-400 bg-gradient-to-br from-white via-red-50 to-green-50 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-red-600 via-green-600 to-red-600 border-b-4 border-yellow-400">
            <CardTitle className="text-white text-2xl flex items-center gap-3 justify-center">
              <Gift className="w-8 h-8 animate-bounce" />
              ¡Comparte la Suerte de Navidad!
              <Star className="w-8 h-8 animate-spin-slow" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-2xl border-2 border-red-300 shadow-lg">
                <p className="text-2xl font-bold text-red-900 mb-2">🎟️ Sobre la Lotería</p>
                <div className="space-y-2 text-red-900">
                  <p>💰 <strong>Precio:</strong> {precioDecimo}€ por décimo</p>
                  <p>📅 <strong>Sorteo:</strong> 22 de Diciembre</p>
                  <p>🎁 <strong>Premio Gordo:</strong> 400.000€ al décimo</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-2xl border-2 border-green-300 shadow-lg">
                <p className="text-2xl font-bold text-green-900 mb-2">👨‍🏫 Cómo Funciona</p>
                <div className="space-y-2 text-green-900">
                  <p>1️⃣ Haz tu pedido aquí</p>
                  {requierePagoAdelantado ? (
                    <>
                      <p>2️⃣ Realiza el pago por transferencia o Bizum</p>
                      <p>3️⃣ Sube el justificante de pago</p>
                      <p>4️⃣ Tu entrenador te entregará los décimos</p>
                      <p>5️⃣ ¡Y a esperar el sorteo! 🎉</p>
                    </>
                  ) : (
                    <>
                      <p>2️⃣ Tu entrenador te entregará los décimos</p>
                      <p>3️⃣ Pagas al entrenador al recibirlos</p>
                      <p>4️⃣ ¡Y a esperar el sorteo! 🎉</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {totalDecimos > 0 && (
              <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 p-6 rounded-2xl border-4 border-yellow-500 shadow-2xl text-center">
                <p className="text-3xl font-black text-red-900 mb-2 animate-pulse">
                  🌟 ¡Ya tienes {totalDecimos} décimo{totalDecimos > 1 ? 's' : ''}! 🌟
                </p>
                <p className="text-xl font-bold text-red-800">
                  Inversión total: {totalInvertido}€
                </p>
                <p className="text-lg text-red-700 mt-2">
                  ¡Mucha suerte en el sorteo! 🍀
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {loteriaAbierta && (
          <div className="text-center">
            <Button
              onClick={() => setShowForm(!showForm)}
              size="lg"
              className="bg-gradient-to-r from-red-600 via-green-600 to-red-600 hover:from-red-700 hover:via-green-700 hover:to-red-700 text-white font-bold text-xl px-12 py-6 rounded-3xl shadow-2xl border-4 border-yellow-400 transform hover:scale-110 transition-all"
            >
              <Sparkles className="w-6 h-6 mr-3 animate-spin" />
              {showForm ? "Cerrar Formulario" : "¡Pedir Décimos Ahora!"}
              <PartyPopper className="w-6 h-6 ml-3 animate-bounce" />
            </Button>
          </div>
        )}

        {showForm && loteriaAbierta && (
          <Card className="border-4 border-yellow-400 shadow-2xl bg-white">
            <CardHeader className="bg-gradient-to-r from-green-600 to-red-600 border-b-4 border-yellow-400">
              <CardTitle className="text-white text-2xl text-center">
                🎄 Solicitar Décimos de Lotería 🎄
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {isCoach && !hasPlayers ? (
                  <div className="space-y-2">
                    <Label className="text-lg font-bold text-slate-900">🎓 Categoría</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="border-2 border-red-300 h-12 text-lg">
                        <SelectValue placeholder="Selecciona tu categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {(user?.categorias_entrena && user.categorias_entrena.length > 0 ? user.categorias_entrena : [
                          "Fútbol Pre-Benjamín (Mixto)",
                          "Fútbol Benjamín (Mixto)",
                          "Fútbol Alevín (Mixto)",
                          "Fútbol Infantil (Mixto)",
                          "Fútbol Cadete",
                          "Fútbol Juvenil",
                          "Fútbol Aficionado",
                          "Fútbol Femenino",
                          "Baloncesto (Mixto)"
                        ]).map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      ℹ️ Como entrenador/coordinador, tu pedido se asociará a esta categoría
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-lg font-bold text-slate-900">👤 Jugador</Label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger className="border-2 border-red-300 h-12 text-lg">
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
                )}

                <div className="space-y-2">
                  <Label className="text-lg font-bold text-slate-900">🎟️ Número de Décimos</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={numDecimos}
                    onChange={(e) => setNumDecimos(parseInt(e.target.value) || 1)}
                    className="border-2 border-green-300 h-12 text-lg text-center font-bold"
                  />
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 p-4 rounded-xl border-2 border-yellow-500 text-center">
                    <p className="text-2xl font-black text-red-900">
                      Total: {numDecimos * precioDecimo}€
                    </p>
                  </div>
                </div>

{/* Sección de Pago */}
                {requierePagoAdelantado ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-lg font-bold text-slate-900">💳 Método de Pago</Label>
                      <Select value={metodoPago} onValueChange={setMetodoPago}>
                        <SelectTrigger className="border-2 border-red-300 h-12 text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Transferencia">💳 Transferencia Bancaria</SelectItem>
                          {seasonConfig?.bizum_activo && (
                            <SelectItem value="Bizum">📱 Bizum</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {metodoPago === "Bizum" && seasonConfig?.bizum_telefono && (
                        <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                          <p className="text-sm text-slate-900">
                            📱 <strong>Enviar Bizum al:</strong> {seasonConfig.bizum_telefono}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Concepto: Lotería {selectedPlayer ? players.find(p => p.id === selectedPlayer)?.nombre : user?.full_name}
                          </p>
                        </div>
                      )}
                      {metodoPago === "Transferencia" && (
                        <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                          <p className="text-sm text-slate-900">
                            🏦 <strong>Transferencia a:</strong> ES12 1234 5678 1234 5678 9012
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Concepto: Lotería {selectedPlayer ? players.find(p => p.id === selectedPlayer)?.nombre : user?.full_name}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <Label className="text-base font-semibold text-orange-900">
                        📎 Justificante de Pago * (Obligatorio)
                      </Label>
                      <p className="text-sm text-orange-800">
                        {metodoPago === "Bizum" 
                          ? "Sube una captura del justificante de Bizum" 
                          : "Sube una captura o foto del justificante de tu transferencia bancaria"}
                      </p>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('lottery-file-upload').click()}
                          disabled={uploadingFile}
                          className="flex-1 bg-white"
                        >
                          {uploadingFile ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {justificanteUrl ? "Cambiar justificante" : "Subir justificante"}
                            </>
                          )}
                        </Button>
                        {justificanteUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setJustificanteUrl("")}
                            className="bg-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        id="lottery-file-upload"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {justificanteUrl ? (
                        <p className="text-sm text-green-600 font-medium">✓ Justificante subido correctamente</p>
                      ) : (
                        <p className="text-sm text-red-600 font-medium">⚠️ Debes subir el justificante para continuar</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-xl border-2 border-green-300">
                    <p className="text-green-900 font-bold text-lg mb-2">💵 Pago al Entrenador</p>
                    <p className="text-green-800 text-sm">
                      No necesitas pagar ahora. Tu entrenador te entregará los décimos y le pagarás directamente cuando los recibas.
                    </p>
                    <p className="text-green-700 text-xs mt-2">
                      💡 Importe a pagar: <strong>{numDecimos * precioDecimo}€</strong>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-lg font-bold text-slate-900">📝 Notas (opcional)</Label>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Alguna nota adicional..."
                    className="border-2 border-red-300 min-h-[80px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="flex-1 h-12 text-lg border-2"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 text-lg bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 border-2 border-yellow-400 font-bold"
                    disabled={createOrderMutation.isPending || (requierePagoAdelantado && !justificanteUrl)}
                  >
                    {createOrderMutation.isPending ? "Enviando..." : "🎁 Confirmar Pedido"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Mis Pedidos */}
        <Card className="border-4 border-yellow-400 shadow-2xl bg-white">
          <CardHeader className="bg-gradient-to-r from-red-600 to-green-600 border-b-4 border-yellow-400">
            <CardTitle className="text-white text-2xl">🎅 Mis Pedidos de Lotería</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-8xl mb-4 animate-bounce">🎄</div>
                <p className="text-2xl text-slate-700 font-bold">No has pedido lotería todavía</p>
                {loteriaAbierta && (
                  <p className="text-lg text-slate-500 mt-2">¡Haz clic arriba para pedir tus décimos!</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <Card key={order.id} className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{order.jugador_nombre}</h3>
                          <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {order.pagado && (
                            <Badge className="bg-green-100 text-green-700 border-2 border-green-300 text-base px-4 py-2">
                              💰 PAGADO
                            </Badge>
                          )}
                          {order.estado === "Entregado" && (
                            <Badge className="bg-purple-100 text-purple-700 border-2 border-purple-300 text-base px-4 py-2">
                              ✅ ENTREGADO
                            </Badge>
                          )}
                          {!order.pagado && order.estado !== "Entregado" && (
                            <Badge className="bg-orange-100 text-orange-700 border-2 border-orange-300 text-base px-4 py-2">
                              🕐 PENDIENTE
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl space-y-2">
                        <p className="text-lg">🎟️ <strong>Décimos:</strong> {order.numero_decimos}</p>
                        <p className="text-lg">💰 <strong>Total:</strong> {order.total}€</p>
                        {order.estado === "Entregado" && order.fecha_entrega && (
                          <p className="text-lg">📅 <strong>Fecha entrega:</strong> {new Date(order.fecha_entrega).toLocaleDateString('es-ES')}</p>
                        )}
                        {order.notas && (
                          <p className="text-slate-600 mt-2 border-t pt-2">📝 {order.notas}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer navideño */}
        <div className="text-center text-white space-y-3 pb-8">
          <p className="text-2xl font-bold animate-pulse">🎄 ¡Feliz Navidad y Mucha Suerte! 🍀</p>
          <p className="text-lg">CD Bustarviejo • Sorteo 22 de Diciembre</p>
          <div className="flex justify-center gap-4 text-4xl">
            <span className="animate-bounce">⭐</span>
            <span className="animate-pulse">🎁</span>
            <span className="animate-bounce">⭐</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}