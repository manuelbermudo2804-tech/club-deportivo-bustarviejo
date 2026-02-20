import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageCircle, Send, Star, Clock, CheckCircle2, Eye, Filter, Users, Sparkles, Heart } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const TIPOS = [
  { value: "opinion", emoji: "💬", label: "Opinión", color: "bg-blue-100 text-blue-700" },
  { value: "idea", emoji: "💡", label: "Idea", color: "bg-yellow-100 text-yellow-700" },
  { value: "problema", emoji: "🔧", label: "Problema", color: "bg-red-100 text-red-700" },
  { value: "agradecimiento", emoji: "❤️", label: "Gracias", color: "bg-pink-100 text-pink-700" },
  { value: "pregunta", emoji: "❓", label: "Pregunta", color: "bg-purple-100 text-purple-700" },
];

function AdminMessageCard({ msg, onReply, onMarkRead, onToggleHighlight }) {
  const tipoInfo = TIPOS.find(t => t.value === msg.tipo);

  return (
    <Card className={`border-none shadow-lg ${msg.estado === "nuevo" ? "ring-2 ring-orange-300 bg-orange-50/30" : ""} ${msg.destacado ? "ring-2 ring-yellow-300" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${tipoInfo?.color} border-none text-xs`}>
              {tipoInfo?.emoji} {tipoInfo?.label}
            </Badge>
            {msg.emoji_estado && <span className="text-lg">{msg.emoji_estado}</span>}
            {msg.anonimo && <Badge variant="outline" className="text-xs">🕶️ Anónimo</Badge>}
            {msg.estado === "nuevo" && <Badge className="bg-orange-500 text-white text-xs animate-pulse">Nuevo</Badge>}
            {msg.estado === "respondido" && <Badge className="bg-green-100 text-green-700 text-xs">✅ Respondido</Badge>}
            {msg.destacado && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {format(new Date(msg.created_date), "d MMM HH:mm", { locale: es })}
          </span>
        </div>

        {/* Player info */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">
            {msg.anonimo ? "Anónimo" : (msg.jugador_nombre || "Jugador")}
          </span>
          {msg.categoria && <Badge variant="outline" className="text-xs">{msg.categoria}</Badge>}
          {!msg.anonimo && <span className="text-xs text-slate-400">{msg.jugador_email}</span>}
        </div>

        <p className="text-slate-800 leading-relaxed bg-white rounded-xl p-3 border border-slate-100">{msg.mensaje}</p>

        {msg.respuesta_admin && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs font-bold text-green-600 mb-1">Tu respuesta:</p>
            <p className="text-sm text-green-800">{msg.respuesta_admin}</p>
            <p className="text-xs text-green-500 mt-1">
              {msg.respondido_por_nombre} · {msg.fecha_respuesta && format(new Date(msg.fecha_respuesta), "d MMM", { locale: es })}
              {msg.leido_por_jugador && " · ✅ Leído por el jugador"}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {msg.estado === "nuevo" && (
            <Button size="sm" variant="outline" onClick={() => onMarkRead(msg)} className="text-xs">
              <Eye className="w-3 h-3 mr-1" /> Marcar leído
            </Button>
          )}
          <Button size="sm" onClick={() => onReply(msg)} className="text-xs bg-green-600 hover:bg-green-700 text-white">
            <Send className="w-3 h-3 mr-1" /> {msg.respuesta_admin ? "Editar respuesta" : "Responder"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleHighlight(msg)}
            className={`text-xs ${msg.destacado ? "text-yellow-600" : "text-slate-400"}`}
          >
            <Star className={`w-3 h-3 mr-1 ${msg.destacado ? "fill-yellow-500" : ""}`} />
            {msg.destacado ? "Destacado" : "Destacar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JuniorMailboxAdmin() {
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [replyDialog, setReplyDialog] = useState(null);
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["juniorMailboxAdmin"],
    queryFn: () => base44.entities.JuniorMailbox.list("-created_date", 200),
    enabled: !!user,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, respuesta }) => {
      await base44.entities.JuniorMailbox.update(id, {
        respuesta_admin: respuesta,
        respondido_por: user.email,
        respondido_por_nombre: "Administración CD Bustarviejo",
        fecha_respuesta: new Date().toISOString(),
        estado: "respondido",
        leido_por_jugador: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["juniorMailboxAdmin"] });
      setReplyDialog(null);
      setReplyText("");
      toast.success("Respuesta enviada al jugador");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (msg) => base44.entities.JuniorMailbox.update(msg.id, { estado: "leido" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["juniorMailboxAdmin"] }),
  });

  const toggleHighlightMutation = useMutation({
    mutationFn: (msg) => base44.entities.JuniorMailbox.update(msg.id, { destacado: !msg.destacado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["juniorMailboxAdmin"] }),
  });

  const filteredMessages = messages.filter(m => {
    if (statusFilter === "nuevo" && m.estado !== "nuevo") return false;
    if (statusFilter === "leido" && m.estado !== "leido") return false;
    if (statusFilter === "respondido" && m.estado !== "respondido") return false;
    if (statusFilter === "destacado" && !m.destacado) return false;
    if (typeFilter !== "all" && m.tipo !== typeFilter) return false;
    if (categoryFilter !== "all" && m.categoria !== categoryFilter) return false;
    return true;
  });

  const stats = {
    total: messages.length,
    nuevos: messages.filter(m => m.estado === "nuevo").length,
    sinResponder: messages.filter(m => m.estado !== "respondido").length,
    respondidos: messages.filter(m => m.estado === "respondido").length,
  };

  const categories = [...new Set(messages.map(m => m.categoria).filter(Boolean))];
  const moodStats = {};
  messages.forEach(m => {
    if (m.emoji_estado) moodStats[m.emoji_estado] = (moodStats[m.emoji_estado] || 0) + 1;
  });

  const handleReply = (msg) => {
    setReplyDialog(msg);
    setReplyText(msg.respuesta_admin || "");
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          ✉️ Buzón de Jugadores Juveniles
        </h1>
        <p className="text-slate-600 mt-1">Mensajes, opiniones e ideas de los chavales</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{stats.total}</div>
            <p className="text-xs text-slate-500">Total</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-500">{stats.nuevos}</div>
            <p className="text-xs text-slate-500">Sin leer</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-500">{stats.sinResponder}</div>
            <p className="text-xs text-slate-500">Sin responder</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.respondidos}</div>
            <p className="text-xs text-slate-500">Respondidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Mood overview */}
      {Object.keys(moodStats).length > 0 && (
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">🎭 Estado emocional de los jugadores:</p>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(moodStats).sort((a, b) => b[1] - a[1]).map(([emoji, count]) => (
                <div key={emoji} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1">
                  <span className="text-xl">{emoji}</span>
                  <span className="font-bold text-sm text-slate-700">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="nuevo">
              Nuevos {stats.nuevos > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs">{stats.nuevos}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="leido">Leídos</TabsTrigger>
            <TabsTrigger value="respondido">Respondidos</TabsTrigger>
            <TabsTrigger value="destacado">⭐ Destacados</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {TIPOS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Messages */}
      {filteredMessages.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📮</div>
            <p className="text-slate-500">No hay mensajes con estos filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMessages.map(msg => (
            <AdminMessageCard
              key={msg.id}
              msg={msg}
              onReply={handleReply}
              onMarkRead={(m) => markReadMutation.mutate(m)}
              onToggleHighlight={(m) => toggleHighlightMutation.mutate(m)}
            />
          ))}
        </div>
      )}

      {/* Reply dialog */}
      <Dialog open={!!replyDialog} onOpenChange={() => setReplyDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Responder a {replyDialog?.anonimo ? "Anónimo" : replyDialog?.jugador_nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Su mensaje:</p>
              <p className="text-sm text-slate-700">{replyDialog?.mensaje}</p>
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escribe una respuesta cercana y motivante... Recuerda que son chavales 😊"
              className="min-h-[120px]"
            />
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700">
                💡 <strong>Consejo:</strong> Usa un tono cercano y positivo. Agradece que se haya animado a escribir. Si es un problema, muestra empatía.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => replyMutation.mutate({ id: replyDialog.id, respuesta: replyText })}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {replyMutation.isPending ? "Enviando..." : <><Send className="w-4 h-4 mr-2" /> Enviar respuesta</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}