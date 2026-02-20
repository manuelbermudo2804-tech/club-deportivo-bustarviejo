import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, ArrowLeft, MessageCircle, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const TIPOS = [
  { value: "opinion", emoji: "💬", label: "Opinión", color: "from-blue-500 to-cyan-500", desc: "Quiero opinar sobre algo" },
  { value: "idea", emoji: "💡", label: "Idea", color: "from-yellow-500 to-orange-500", desc: "Tengo una idea genial" },
  { value: "problema", emoji: "🔧", label: "Problema", color: "from-red-400 to-pink-500", desc: "Algo no va bien" },
  { value: "agradecimiento", emoji: "❤️", label: "Gracias", color: "from-pink-400 to-rose-500", desc: "Quiero dar las gracias" },
  { value: "pregunta", emoji: "❓", label: "Pregunta", color: "from-purple-500 to-violet-500", desc: "Tengo una duda" },
];

const MOOD_EMOJIS = [
  { emoji: "😊", label: "Genial" },
  { emoji: "😐", label: "Normal" },
  { emoji: "😢", label: "Triste" },
  { emoji: "🤔", label: "Confuso" },
  { emoji: "💪", label: "Motivado" },
  { emoji: "😤", label: "Frustrado" },
];

function NewMessageForm({ user, player, onSent }) {
  const [step, setStep] = useState(0); // 0=tipo, 1=mood, 2=escribir
  const [tipo, setTipo] = useState(null);
  const [mood, setMood] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!mensaje.trim() || !tipo) return;
    setSending(true);
    try {
      await base44.entities.JuniorMailbox.create({
        jugador_id: player?.id || "",
        jugador_nombre: anonimo ? "Anónimo" : (player?.nombre || user?.full_name || "Jugador"),
        jugador_email: user.email,
        categoria: player?.categoria_principal || player?.deporte || "",
        tipo,
        emoji_estado: mood || "",
        mensaje: mensaje.trim(),
        anonimo,
        estado: "nuevo",
      });
      onSent();
    } catch (e) {
      console.error("Error enviando mensaje:", e);
    } finally {
      setSending(false);
    }
  };

  if (step === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">✉️</div>
          <h2 className="text-xl font-black text-slate-900">¿Qué quieres contarnos?</h2>
          <p className="text-sm text-slate-500">Elige el tipo de mensaje</p>
        </div>
        <div className="grid gap-2">
          {TIPOS.map((t) => (
            <motion.button
              key={t.value}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setTipo(t.value); setStep(1); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${t.color} text-white shadow-lg hover:shadow-xl transition-shadow text-left`}
            >
              <span className="text-3xl">{t.emoji}</span>
              <div>
                <p className="font-bold text-base">{t.label}</p>
                <p className="text-white/80 text-xs">{t.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (step === 1) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="text-center mb-2">
          <div className="text-5xl mb-2">🎭</div>
          <h2 className="text-xl font-black text-slate-900">¿Cómo te sientes?</h2>
          <p className="text-sm text-slate-500">Esto nos ayuda a entenderte mejor</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {MOOD_EMOJIS.map((m) => (
            <motion.button
              key={m.emoji}
              whileTap={{ scale: 0.9 }}
              onClick={() => { setMood(m.emoji); setStep(2); }}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                mood === m.emoji ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-4xl">{m.emoji}</span>
              <span className="text-xs font-medium text-slate-600">{m.label}</span>
            </motion.button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => { setMood(null); setStep(2); }} className="w-full text-slate-400">
          Prefiero no decirlo →
        </Button>
        <Button variant="outline" onClick={() => setStep(0)} className="w-full">
          ← Volver
        </Button>
      </motion.div>
    );
  }

  const tipoInfo = TIPOS.find(t => t.value === tipo);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge className={`bg-gradient-to-r ${tipoInfo?.color} text-white border-none`}>
          {tipoInfo?.emoji} {tipoInfo?.label}
        </Badge>
        {mood && <span className="text-2xl">{mood}</span>}
      </div>

      <div>
        <Textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Escribe aquí lo que quieras contarnos... Todo vale, no tengas miedo 😊"
          className="min-h-[140px] text-base rounded-2xl border-2 border-slate-200 focus:border-orange-400 resize-none"
          maxLength={1000}
        />
        <p className="text-right text-xs text-slate-400 mt-1">{mensaje.length}/1000</p>
      </div>

      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
        <Switch checked={anonimo} onCheckedChange={setAnonimo} />
        <div>
          <Label className="font-medium text-sm">Enviar anónimo</Label>
          <p className="text-xs text-slate-500">
            {anonimo ? "Tu nombre NO aparecerá. Solo verán tu categoría." : "El club verá tu nombre para poder ayudarte mejor."}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Volver</Button>
        <Button
          onClick={handleSend}
          disabled={!mensaje.trim() || sending}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl"
        >
          {sending ? "Enviando..." : <><Send className="w-4 h-4 mr-2" /> Enviar</>}
        </Button>
      </div>
    </motion.div>
  );
}

function MessageCard({ msg, isOwn }) {
  const tipoInfo = TIPOS.find(t => t.value === msg.tipo);
  const isReplied = msg.estado === "respondido" && msg.respuesta_admin;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border-none shadow-lg overflow-hidden ${isReplied ? "ring-2 ring-green-300" : ""}`}>
        <div className={`h-1.5 bg-gradient-to-r ${tipoInfo?.color || "from-slate-400 to-slate-500"}`} />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{tipoInfo?.emoji}</span>
              <Badge variant="outline" className="text-xs">{tipoInfo?.label}</Badge>
              {msg.emoji_estado && <span className="text-lg">{msg.emoji_estado}</span>}
              {msg.anonimo && <Badge variant="outline" className="text-xs bg-slate-50">🕶️ Anónimo</Badge>}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              {isReplied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              {format(new Date(msg.created_date), "d MMM", { locale: es })}
            </div>
          </div>

          <p className="text-slate-800 text-sm leading-relaxed">{msg.mensaje}</p>

          {isReplied && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 mt-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-green-700">
                  Respuesta de Administración CD Bustarviejo
                </span>
              </div>
              <p className="text-sm text-green-800 leading-relaxed">{msg.respuesta_admin}</p>
              {msg.fecha_respuesta && (
                <p className="text-xs text-green-500 mt-1">
                  {format(new Date(msg.fecha_respuesta), "d 'de' MMMM", { locale: es })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function JuniorMailbox() {
  const [user, setUser] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: player } = useQuery({
    queryKey: ["juniorPlayer", user?.email],
    queryFn: async () => {
      let p = await base44.entities.Player.filter({ acceso_menor_email: user.email, acceso_menor_autorizado: true, activo: true });
      if (p.length === 0) p = await base44.entities.Player.filter({ email_jugador: user.email, acceso_jugador_autorizado: true, activo: true });
      return p[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["juniorMessages", user?.email],
    queryFn: () => base44.entities.JuniorMailbox.filter({ jugador_email: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  // Mark replies as read
  useEffect(() => {
    if (!messages.length || !user) return;
    messages.forEach(async (m) => {
      if (m.estado === "respondido" && !m.leido_por_jugador) {
        await base44.entities.JuniorMailbox.update(m.id, { leido_por_jugador: true });
      }
    });
  }, [messages, user]);

  const unreadReplies = messages.filter(m => m.estado === "respondido" && !m.leido_por_jugador).length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("MinorDashboard")}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              ✉️ Mi Buzón
            </h1>
            <p className="text-xs text-slate-500">Tu voz importa · Escríbenos lo que quieras</p>
          </div>
          {unreadReplies > 0 && (
            <Badge className="bg-green-500 text-white animate-pulse">{unreadReplies} nuevas</Badge>
          )}
        </div>

        {/* New message button / form */}
        {showNew ? (
          <Card className="border-none shadow-xl">
            <CardContent className="p-5">
              <NewMessageForm
                user={user}
                player={player}
                onSent={() => {
                  setShowNew(false);
                  queryClient.invalidateQueries({ queryKey: ["juniorMessages"] });
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setShowNew(true)}
              className="w-full py-6 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-base rounded-2xl shadow-xl"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Escribir nuevo mensaje
            </Button>
          </motion.div>
        )}

        {/* Motivational banner */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-4 text-center">
          <p className="text-sm font-medium text-purple-800">
            💜 Este es tu espacio seguro. Puedes contar lo que sea, sin miedo.
          </p>
          <p className="text-xs text-purple-600 mt-1">
            El club leerá tu mensaje y te contestará si lo necesitas.
          </p>
        </div>

        {/* Messages list */}
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-7xl mb-4">📮</div>
            <p className="text-slate-500 font-medium">Tu buzón está vacío</p>
            <p className="text-slate-400 text-sm mt-1">¡Anímate a escribir tu primer mensaje!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
              Mis mensajes ({messages.length})
            </h3>
            {messages.map((msg) => (
              <MessageCard key={msg.id} msg={msg} isOwn />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}