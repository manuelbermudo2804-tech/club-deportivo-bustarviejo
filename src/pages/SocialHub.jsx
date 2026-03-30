import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Calendar, Trophy, Megaphone, Heart, Users, PenLine, Loader2, Wand2, Copy, Check, ArrowLeft, MessageCircle, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import moment from "moment";

const CONTENT_TYPES = [
  { id: "partidos_finde", title: "⚽ Partidos del Finde", emoji: "⚽", icon: Calendar, gradient: "from-orange-500 to-orange-600" },
  { id: "resultados", title: "📊 Resultados", emoji: "📊", icon: Trophy, gradient: "from-blue-500 to-blue-600" },
  { id: "anuncio", title: "📢 Anuncio", emoji: "📢", icon: Megaphone, gradient: "from-pink-500 to-pink-600" },
  { id: "hazte_socio", title: "❤️ Hazte Socio", emoji: "❤️", icon: Heart, gradient: "from-purple-500 to-purple-600" },
  { id: "femenino", title: "⚽👧 Femenino", emoji: "⚽", icon: Users, gradient: "from-fuchsia-500 to-fuchsia-600" },
  { id: "evento", title: "🎉 Evento", emoji: "🎉", icon: Calendar, gradient: "from-green-500 to-green-600" },
  { id: "personalizado", title: "✏️ Libre", emoji: "✏️", icon: PenLine, gradient: "from-slate-500 to-slate-600" },
];

async function fetchDataForType(type) {
  if (type === "partidos_finde") {
    const today = new Date();
    const dow = today.getDay();
    const sat = new Date(today); sat.setDate(today.getDate() + ((6 - dow + 7) % 7 || 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const satStr = sat.toISOString().split("T")[0];
    const sunStr = sun.toISOString().split("T")[0];
    const [partidos, convos] = await Promise.all([
      base44.entities.ProximoPartido.filter({ jugado: false }, "fecha_iso", 50).catch(() => []),
      base44.entities.Convocatoria.filter({ publicada: true, cerrada: false }, "-fecha_partido", 30).catch(() => []),
    ]);
    const pf = partidos.filter(p => p.fecha_iso >= satStr && p.fecha_iso <= sunStr);
    const cf = convos.filter(c => c.fecha_partido >= satStr && c.fecha_partido <= sunStr);
    let d = "";
    pf.forEach(p => { d += `${p.categoria}: ${p.local} vs ${p.visitante} | ${p.fecha} ${p.hora||""} | Campo: ${p.campo||"?"}\n`; });
    cf.forEach(c => { d += `${c.categoria}: ${c.titulo} | ${c.fecha_partido} ${c.hora_partido} | ${c.ubicacion} | ${c.local_visitante||""}\n`; });
    return d || "No hay partidos este finde. Escribe los datos aquí.";
  }
  if (type === "resultados") {
    const [res, jug] = await Promise.all([
      base44.entities.Resultado.filter({ estado: "finalizado" }, "-fecha_actualizacion", 30).catch(() => []),
      base44.entities.ProximoPartido.filter({ jugado: true }, "-fecha_iso", 20).catch(() => []),
    ]);
    let d = "";
    res.forEach(r => { d += `${r.categoria} J${r.jornada||"?"}: ${r.local} ${r.goles_local??""} - ${r.goles_visitante??""} ${r.visitante}\n`; });
    jug.slice(0,15).forEach(p => { d += `${p.categoria}: ${p.local} ${p.goles_local??""} - ${p.goles_visitante??""} ${p.visitante} (${p.fecha||""})\n`; });
    return d || "No hay resultados recientes. Escribe los datos aquí.";
  }
  if (type === "anuncio") {
    const anuncios = await base44.entities.Announcement.filter({ publicado: true }, "-created_date", 5).catch(() => []);
    if (!anuncios.length) return "No hay anuncios recientes. Escribe tu anuncio aquí.";
    return anuncios.map((a,i) => `${i+1}. ${a.titulo}\n${a.contenido?.substring(0,300)||""}`).join("\n\n");
  }
  if (type === "hazte_socio") {
    const s = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    return `Programa de Socios CD Bustarviejo\nPrecio: ${s[0]?.precio_socio||25}€/temporada\nCarnet digital con QR, descuentos en comercios locales\nEnlace: ${window.location.origin}/ClubMembership`;
  }
  if (type === "femenino") {
    return `Captación Fútbol Femenino CD Bustarviejo\nTodas las edades, no hace falta experiencia\nEntrenadores titulados, ambiente familiar\nEnlace: ${window.location.origin}/JoinFemenino`;
  }
  if (type === "evento") {
    const evs = await base44.entities.Event.filter({ publicado: true }, "-fecha", 10).catch(() => []);
    const fut = evs.filter(e => e.fecha >= new Date().toISOString().split("T")[0]);
    if (!fut.length) return "No hay eventos próximos. Escribe los datos del evento.";
    return fut.slice(0,5).map(e => `${e.titulo} | ${moment(e.fecha).format("DD/MM/YYYY")} ${e.hora||""} | ${e.ubicacion||""}\n${e.descripcion?.substring(0,150)||""}`).join("\n\n");
  }
  return "";
}

const WA_PROMPT = `Eres el community manager del CD Bustarviejo, un club de fútbol base de la Sierra Norte de Madrid. Tu estilo es:

🔥 ENERGÉTICO, CERCANO, DE PUEBLO — como un mensaje de un amigo que te está contando las cosas del club con pasión
🎯 Usas emojis con CRITERIO (no spam, pero que le den vida)
📱 Formato PERFECTO para WhatsApp: saltos de línea claros, bloques visuales, fácil de leer en el móvil
⚡ Los textos tienen que ser LA LECHE DE CHULOS — que la gente quiera compartirlos
🏟️ Menciona SIEMPRE "CD Bustarviejo" o "C.D. Bustarviejo" al menos una vez
❌ NO inventes datos — usa SOLO lo que te doy
✅ Si hay victorias, CELÉBRALAS con ganas
💪 Si hay derrotas, anima al equipo

REGLAS DE FORMATO:
- Máximo 600 caracteres
- Primera línea: emoji llamativo + título en mayúsculas
- Datos organizados por categoría
- Cierre motivador o CTA
- NO uses hashtags (es WhatsApp, no Instagram)`;

export default function SocialHub() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [datos, setDatos] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["socialPosts"],
    queryFn: () => base44.entities.SocialPost.list("-created_date", 20),
    staleTime: 60000,
  });

  const selectType = async (type) => {
    setSelectedType(type);
    setWhatsappText("");
    setEditing(false);
    setLoading(true);
    const d = await fetchDataForType(type);
    setDatos(d);
    setLoading(false);
  };

  const generate = async () => {
    if (!datos.trim()) { toast.error("Escribe algo primero"); return; }
    setGenerating(true);
    try {
      const typeLabel = CONTENT_TYPES.find(t => t.id === selectedType)?.title || selectedType;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${WA_PROMPT}\n\nTIPO DE CONTENIDO: ${typeLabel}\n\nDATOS:\n${datos}\n\nGenera el mensaje de WhatsApp:`,
      });
      setWhatsappText(typeof result === "string" ? result : JSON.stringify(result));
    } catch (e) {
      toast.error("Error al generar");
    }
    setGenerating(false);
  };

  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success("¡Texto copiado! Ahora pégalo en tu Canal de WhatsApp");
      // Guardar en historial
      const user = await base44.auth.me();
      await base44.entities.SocialPost.create({
        tipo: selectedType,
        titulo: CONTENT_TYPES.find(t => t.id === selectedType)?.title || selectedType,
        contenido_whatsapp: whatsappText,
        enviado_whatsapp: true,
        datos_origen: datos.substring(0, 2000),
        creado_por: user.email,
      });
      queryClient.invalidateQueries({ queryKey: ["socialPosts"] });
      // Abrir WhatsApp
      setTimeout(() => { window.open("https://wa.me/", "_blank"); }, 500);
    } catch {
      toast.error("Error al copiar");
    }
  };

  const typeConfig = CONTENT_TYPES.find(t => t.id === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-5 max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-3">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Canal de WhatsApp</h1>
          <p className="text-slate-400 text-sm mt-1">Genera → Copia → Pega en tu Canal</p>
        </div>

        {/* ========== MENÚ PRINCIPAL ========== */}
        {!selectedType && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm font-medium text-center">¿Qué quieres publicar?</p>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => selectType(type.id)}
                  className={`bg-gradient-to-br ${type.gradient} rounded-2xl p-4 text-left text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.03] active:scale-95`}
                >
                  <type.icon className="w-6 h-6 mb-1.5 opacity-90" />
                  <p className="font-bold text-sm">{type.title}</p>
                </button>
              ))}
            </div>

            {/* Historial compacto */}
            {history.length > 0 && (
              <div className="bg-slate-800/60 rounded-2xl p-4 space-y-2">
                <p className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Últimas publicaciones
                </p>
                {history.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">✓</span>
                    <span className="text-slate-300 truncate flex-1">{post.titulo}</span>
                    <span className="text-slate-500 text-xs">{moment(post.created_date).format("DD/MM")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== GENERADOR ========== */}
        {selectedType && (
          <div className="space-y-4">
            <button
              onClick={() => { setSelectedType(null); setWhatsappText(""); setDatos(""); }}
              className="text-slate-400 text-sm flex items-center gap-1 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {loading ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-green-400" />
                <p className="text-slate-300 mt-3 text-sm">Cargando datos del club...</p>
              </div>
            ) : (
              <>
                {/* Datos editables */}
                <div className="bg-slate-800/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-400 text-xs font-bold">📝 Datos {selectedType !== "personalizado" && "(editables)"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${typeConfig?.gradient} text-white font-bold`}>
                      {typeConfig?.title}
                    </span>
                  </div>
                  <textarea
                    value={datos}
                    onChange={(e) => setDatos(e.target.value)}
                    placeholder="Escribe aquí los datos para generar el contenido..."
                    className="w-full min-h-[100px] p-3 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 resize-y focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Botón GENERAR */}
                {!whatsappText && (
                  <button
                    onClick={generate}
                    disabled={generating || !datos.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Generando texto molón...</>
                    ) : (
                      <><Wand2 className="w-5 h-5" /> ✨ Generar mensaje</>
                    )}
                  </button>
                )}

                {/* Resultado */}
                {whatsappText && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Preview tipo WhatsApp */}
                    <div className="bg-[#e5ddd5] rounded-2xl p-3 shadow-inner">
                      <div className="bg-[#dcf8c6] rounded-xl p-3 shadow max-w-[90%] ml-auto">
                        {editing ? (
                          <textarea
                            value={whatsappText}
                            onChange={(e) => setWhatsappText(e.target.value)}
                            className="w-full min-h-[150px] p-2 bg-white rounded-lg text-sm resize-y border-0"
                            autoFocus
                            onBlur={() => setEditing(false)}
                          />
                        ) : (
                          <div
                            onClick={() => setEditing(true)}
                            className="whitespace-pre-wrap text-sm text-slate-800 cursor-text leading-relaxed"
                          >
                            {whatsappText}
                          </div>
                        )}
                        {!editing && (
                          <p className="text-[10px] text-slate-500 mt-1 text-right">Toca para editar</p>
                        )}
                      </div>
                    </div>

                    {/* Botón regenerar */}
                    <button
                      onClick={generate}
                      disabled={generating}
                      className="text-slate-400 text-sm flex items-center gap-1.5 mx-auto hover:text-white transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                      {generating ? "Regenerando..." : "Regenerar texto"}
                    </button>

                    {/* BOTÓN PRINCIPAL — COPIAR Y ABRIR WHATSAPP */}
                    <button
                      onClick={copyAndOpen}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black text-lg py-5 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                    >
                      {copied ? (
                        <><Check className="w-6 h-6" /> ¡Copiado! Abriendo WhatsApp...</>
                      ) : (
                        <><Copy className="w-6 h-6" /> 📋 Copiar y abrir WhatsApp</>
                      )}
                    </button>
                    <p className="text-slate-500 text-xs text-center">
                      Se copia al portapapeles → se abre WhatsApp → pegas en tu Canal
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}