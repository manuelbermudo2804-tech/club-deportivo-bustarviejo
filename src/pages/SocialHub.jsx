import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ArrowLeft, RefreshCw,
  Clock, Send, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/es";

import SocialOpportunitiesBanner from "@/components/social/SocialOpportunitiesBanner";
import ContentTypeGrid from "@/components/social/ContentTypeGrid";
import ContentTypeSearch from "@/components/social/ContentTypeSearch";
import CanalSelector from "@/components/social/CanalSelector";
import { publicarEnCanales } from "@/components/social/publicarEnCanales";
import { getCanalById } from "@/components/social/canales";
import ToneSelector from "@/components/social/ToneSelector";
import MessagePreview from "@/components/social/MessagePreview";
import ImageGenerator from "@/components/social/ImageGenerator";
import { getContentTypeById, getTonoById } from "@/components/social/contentTypes";
import { fetchDataForType } from "@/components/social/fetchContentData";

moment.locale('es');

const buildPrompt = (typeLabel, datos, tonoId) => {
  const tono = getTonoById(tonoId);
  return `Eres el community manager del CD Bustarviejo (fútbol base, Sierra Norte de Madrid).

${tono.promptHint}

Genera un mensaje BONITO para Telegram/WhatsApp del CD Bustarviejo con estos datos:

TIPO: ${typeLabel}

DATOS:
${datos}

REGLAS:
- Menciona "CD Bustarviejo" al menos una vez
- Usa EMOJIS con criterio para hacerlo visual y atractivo (al inicio, separadores, listas)
- Saltos de línea claros, fácil de leer
- ${tonoId === 'corto' ? 'MÁX 200 caracteres' : tonoId === 'epico' ? 'MÁX 700 caracteres' : 'MÁX 600 caracteres'}
- Primera línea: emoji llamativo + título en mayúsculas (excepto tono pro)
- NO hashtags, NO inventes datos
- Si hay victoria → celebra; si hay derrota → anima
- Cierra con una frase corta de cierre o llamada a la acción

Devuelve SOLO el texto del mensaje, sin comillas, sin explicaciones.`;
};

export default function SocialHub() {
  const queryClient = useQueryClient();

  const [view, setView] = useState('menu');
  const [selectedType, setSelectedType] = useState(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [datos, setDatos] = useState("");
  const [text, setText] = useState("");
  const [tono, setTono] = useState("cercano");
  const [editing, setEditing] = useState(false);
  const [showDatos, setShowDatos] = useState(false);

  const [imageUrl, setImageUrl] = useState(null);

  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState("");
  const [canales, setCanales] = useState(["telegram"]);

  const { data: history = [] } = useQuery({
    queryKey: ["socialPosts"],
    queryFn: async () => {
      const all = await base44.entities.SocialPost.list("-created_date", 50);
      // Filtrar solo manuales (los automáticos llevan sufijo _auto)
      return (all || []).filter(p => !String(p.tipo || '').endsWith('_auto')).slice(0, 30);
    },
    staleTime: 60000,
  });

  const typeConfig = getContentTypeById(selectedType);

  const resetEditor = () => {
    setText(""); setDatos(""); setTono("cercano"); setEditing(false);
    setImageUrl(null); setShowDatos(false);
  };

  const selectType = async (type) => {
    setSelectedType(type);
    resetEditor();
    setView('editor');
    setLoading(true);
    const d = await fetchDataForType(type);
    setDatos(d);
    setLoading(false);
    setTimeout(() => generateText(d, type), 100);
  };

  const selectOpportunity = (opp) => {
    const type = opp.socialType || opp.type;
    setSelectedType(type);
    resetEditor();
    setView('editor');
    setDatos(opp.datos || "");
    setTimeout(() => generateText(opp.datos || "", type), 100);
  };

  const goBackToMenu = () => {
    setView('menu');
    setSelectedType(null);
    resetEditor();
  };

  const generateText = async (datosToUse, typeToUse) => {
    const finalDatos = datosToUse || datos;
    const finalType = typeToUse || selectedType;
    if (!finalDatos.trim()) return;

    setGenerating(true);
    try {
      const typeLabel = getContentTypeById(finalType)?.title || finalType;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(typeLabel, finalDatos, tono),
      });
      if (typeof result === "string") setText(result.trim());
    } catch (e) {
      toast.error("Error al generar el mensaje");
      console.error(e);
    }
    setGenerating(false);
  };

  const publishNow = async () => {
    if (!text.trim()) { toast.error("No hay texto para publicar"); return; }
    if (!canales.length) { toast.error("Elige al menos un canal"); return; }
    setPublishing(true);
    try {
      const user = await base44.auth.me();
      const titulo = typeConfig?.title || selectedType;
      const { resultados, telegramMessageId } = await publicarEnCanales({
        canales, texto: text, imageUrl, titulo,
      });

      const ok = resultados.filter(r => r.ok).map(r => getCanalById(r.canal)?.label);
      const fallos = resultados.filter(r => !r.ok);
      if (ok.length) toast.success(`Publicado en: ${ok.join(', ')}`);
      fallos.forEach(f => toast.error(`${getCanalById(f.canal)?.label}: ${f.error}`));

      if (ok.length) {
        await base44.entities.SocialPost.create({
          tipo: selectedType, titulo,
          contenido_whatsapp: text, tono,
          imagen_url: imageUrl,
          enviado_telegram: canales.includes('telegram') && !!telegramMessageId,
          telegram_message_id: telegramMessageId || '',
          enviado_whatsapp: canales.includes('whatsapp'),
          datos_origen: datos.substring(0, 2000),
          creado_por: user.email,
        });
        queryClient.invalidateQueries({ queryKey: ["socialPosts"] });
        if (canales.includes('whatsapp')) {
          setTimeout(() => { window.open("https://wa.me/", "_blank"); }, 600);
        }
        if (!fallos.length) goBackToMenu();
      }
    } catch (e) {
      toast.error("Error: " + (e?.message || ""));
    }
    setPublishing(false);
  };

  // Llegada desde el Centro de Contenido con una foto ya elegida
  const initFromUrl = useRef(false);
  useEffect(() => {
    if (initFromUrl.current) return;
    const params = new URLSearchParams(window.location.search);
    const imagen = params.get("imagen");
    if (!imagen) return;
    initFromUrl.current = true;
    const desc = params.get("desc") || "";
    setSelectedType("galeria");
    setImageUrl(imagen);
    setDatos(desc);
    setView("editor");
    generateText(desc, "galeria");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">

        {/* Cabecera común del club */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
                <Send className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Comunicación y redes sociales</p>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Centro de Difusión Social</h1>
                <p className="mt-1 text-sm text-slate-300"><span className="font-semibold text-orange-300">IA</span> · Telegram · App · WhatsApp · Redes</p>
              </div>
            </div>
            {history.length > 0 && (
              <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-slate-200">
                <Clock className="h-3.5 w-3.5 text-orange-300" />
                {history.length} publicaciones recientes
              </span>
            )}
          </div>
        </div>

        {view === 'menu' && (
          <div className="space-y-5">
            <SocialOpportunitiesBanner onSelect={selectOpportunity} />
            <p className="text-slate-700 text-sm font-semibold text-center">¿Qué quieres publicar?</p>
            <ContentTypeSearch value={search} onChange={setSearch} />
            <ContentTypeGrid onSelect={selectType} search={search} />

            {history.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Clock className="h-4 w-4 text-orange-600" /> Últimas publicaciones
                </p>
                {history.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex min-w-0 items-center gap-3 border-t border-slate-100 pt-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">✓</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{post.titulo}</span>
                    <span className="shrink-0 text-xs text-slate-400">{moment(post.created_date).format("DD/MM")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'editor' && (
          <div className="space-y-3">
            <button onClick={goBackToMenu} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {loading || (generating && !text) ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="w-12 h-12 animate-spin text-orange-400" />
                <p className="mt-4 text-sm font-bold text-slate-700">
                  {loading ? "Cargando datos del club..." : "✨ Generando mensaje..."}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
                    {typeConfig?.title}
                  </span>
                  <button
                    onClick={() => setShowDatos(s => !s)}
                    className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-orange-700 hover:underline"
                  >
                    {showDatos ? "Ocultar datos" : "Ver/editar datos"}
                  </button>
                </div>

                {showDatos && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="mb-2 text-xs font-bold text-slate-700">📝 Datos usados por la IA</p>
                    <textarea
                      value={datos}
                      onChange={(e) => setDatos(e.target.value)}
                      className="w-full min-h-[80px] resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                    <button
                      onClick={() => generateText(datos, selectedType)}
                      disabled={generating}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
                      Regenerar con estos datos
                    </button>
                  </div>
                )}

                <ToneSelector value={tono} onChange={(v) => { setTono(v); generateText(datos, selectedType); }} />

                {text && (
                  <div className="space-y-3 animate-fade-in">
                    <MessagePreview
                      text={text}
                      imageUrl={imageUrl}
                      editing={editing}
                      onChange={setText}
                      onStartEdit={() => setEditing(true)}
                      onStopEdit={() => setEditing(false)}
                    />

                    <button
                      onClick={() => generateText(datos, selectedType)}
                      disabled={generating}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                      Regenerar mensaje
                    </button>

                    <ImageGenerator value={imageUrl} onChange={setImageUrl} />

                    <CanalSelector value={canales} onChange={setCanales} />

                    <button
                      onClick={publishNow}
                      disabled={publishing || !canales.length}
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-orange-600 py-4 text-base font-bold text-white shadow-md transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
                    >
                      {publishing ? (
                        <><Loader2 className="w-6 h-6 animate-spin" /> Publicando...</>
                      ) : (
                        <><Send className="w-6 h-6" /> Publicar en {canales.length} canal{canales.length === 1 ? '' : 'es'}</>
                      )}
                    </button>
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