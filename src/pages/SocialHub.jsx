import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Wand2, Copy, Check, ArrowLeft, MessageCircle, RefreshCw,
  Clock, Send,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/es";

import SocialOpportunitiesBanner from "@/components/social/SocialOpportunitiesBanner";
import ContentTypeGrid from "@/components/social/ContentTypeGrid";
import ToneSelector from "@/components/social/ToneSelector";
import ImageGenerator from "@/components/social/ImageGenerator";
import PosterDesigner from "@/components/social/PosterDesigner";
import MessagePreview from "@/components/social/MessagePreview";
import { CONTENT_TYPES, getContentTypeById, getTonoById } from "@/components/social/contentTypes";
import { fetchDataForType } from "@/components/social/fetchContentData";

moment.locale('es');

const buildPrompt = (typeLabel, datos, tonoId) => {
  const tono = getTonoById(tonoId);
  return `Eres el community manager del CD Bustarviejo, un club de fútbol base de la Sierra Norte de Madrid.

${tono.promptHint}

REGLAS GENERALES:
🏟️ Menciona "CD Bustarviejo" o "C.D. Bustarviejo" al menos una vez
❌ NO inventes datos — usa SOLO lo que te doy
✅ Si hay victorias, CELÉBRALAS con ganas
💪 Si hay derrotas, anima al equipo
📱 Formato perfecto para Telegram/WhatsApp: saltos de línea claros, fácil de leer
${tonoId === 'corto' ? '⚡ MÁXIMO 200 caracteres TOTAL' : tonoId === 'epico' ? '🔥 Máximo 700 caracteres' : '📏 Máximo 600 caracteres'}
${tonoId !== 'pro' ? '😀 Emojis con criterio (no spam, pero que le den vida)' : '🎯 Emojis mínimos, estilo prensa'}
- NO hashtags
- Primera línea: emoji llamativo + título en mayúsculas (excepto en tono "pro")

TIPO DE CONTENIDO: ${typeLabel}

DATOS:
${datos}

Genera el mensaje:`;
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
  const [imageUrl, setImageUrl] = useState(null);
  const [imageMode, setImageMode] = useState("poster"); // "poster" | "simple"
  const [editing, setEditing] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["socialPosts"],
    queryFn: () => base44.entities.SocialPost.list("-created_date", 30),
    staleTime: 60000,
  });

  const typeConfig = getContentTypeById(selectedType);

  const resetEditor = () => {
    setText(""); setDatos(""); setImageUrl(null);
    setTono("cercano"); setEditing(false);
  };

  const selectType = async (type) => {
    setSelectedType(type);
    resetEditor();
    setView('editor');
    setLoading(true);
    const d = await fetchDataForType(type);
    setDatos(d);
    setLoading(false);
  };

  const selectOpportunity = (opp) => {
    setSelectedType(opp.socialType || opp.type);
    resetEditor();
    setView('editor');
    setDatos(opp.datos || "");
  };

  const goBackToMenu = () => {
    setView('menu');
    setSelectedType(null);
    resetEditor();
  };

  const generate = async () => {
    if (!datos.trim()) { toast.error("Escribe algo primero"); return; }
    setGenerating(true);
    try {
      const typeLabel = typeConfig?.title || selectedType;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(typeLabel, datos, tono),
      });
      setText(typeof result === "string" ? result : JSON.stringify(result));
    } catch (e) {
      toast.error("Error al generar");
    }
    setGenerating(false);
  };

  const publishNow = async () => {
    if (!text.trim()) { toast.error("No hay texto para publicar"); return; }
    setPublishing(true);
    try {
      const user = await base44.auth.me();
      const titulo = typeConfig?.title || selectedType;
      const htmlMessage = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const { data } = await base44.functions.invoke("publishToTelegramAdvanced", {
        message: htmlMessage,
        image_url: imageUrl,
        parse_mode: "HTML",
      });
      if (data?.success) {
        toast.success("✈️ ¡Publicado en Telegram!");
        await base44.entities.SocialPost.create({
          tipo: selectedType,
          titulo,
          contenido_whatsapp: text,
          tono,
          imagen_url: imageUrl,
          enviado_telegram: true,
          telegram_message_id: String(data.message_id || ''),
          datos_origen: datos.substring(0, 2000),
          creado_por: user.email,
        });
        queryClient.invalidateQueries({ queryKey: ["socialPosts"] });
        goBackToMenu();
      } else {
        toast.error(data?.error || "Error al publicar");
      }
    } catch (e) {
      toast.error("Error: " + (e?.message || ""));
    }
    setPublishing(false);
  };

  const copyForWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success("¡Copiado! Pégalo en tu Canal de WhatsApp");
      const user = await base44.auth.me();
      await base44.entities.SocialPost.create({
        tipo: selectedType,
        titulo: typeConfig?.title || selectedType,
        contenido_whatsapp: text,
        tono,
        imagen_url: imageUrl,
        enviado_whatsapp: true,
        datos_origen: datos.substring(0, 2000),
        creado_por: user.email,
      });
      queryClient.invalidateQueries({ queryKey: ["socialPosts"] });
      setTimeout(() => { window.open("https://wa.me/", "_blank"); }, 500);
    } catch {
      toast.error("Error al copiar");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-5 max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-sky-400/30">
              <Send className="w-7 h-7 text-white" />
            </div>
            <div className="text-slate-500 text-2xl font-light">+</div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-green-400/30">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Centro de Difusión Social
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            <span className="text-sky-400 font-semibold">Telegram</span> automático con IA + foto
          </p>

          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              Telegram + WhatsApp
            </span>
            {history.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <Clock className="w-3 h-3" />
                {history.length} publicaciones
              </span>
            )}
          </div>
        </div>

        {view === 'menu' && (
          <div className="space-y-5">
            <SocialOpportunitiesBanner onSelect={selectOpportunity} />
            <p className="text-slate-300 text-sm font-medium text-center">¿Qué quieres publicar?</p>
            <ContentTypeGrid onSelect={selectType} />

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

        {view === 'editor' && (
          <div className="space-y-3">
            <button onClick={goBackToMenu} className="text-slate-400 text-sm flex items-center gap-1 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {loading ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
                <p className="text-slate-300 mt-3 text-sm">Cargando datos del club...</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-400 text-xs font-bold">📝 Datos {selectedType !== "personalizado" && "(editables)"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${typeConfig?.gradient} text-white font-bold`}>
                      {typeConfig?.title}
                    </span>
                  </div>
                  <textarea
                    value={datos}
                    onChange={(e) => setDatos(e.target.value)}
                    placeholder="Datos para generar el contenido..."
                    className="w-full min-h-[100px] p-3 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 resize-y focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <ToneSelector value={tono} onChange={setTono} />

                {!text && (
                  <button
                    onClick={generate}
                    disabled={generating || !datos.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-lg py-4 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generando texto épico...</> : <><Wand2 className="w-5 h-5" /> ✨ Generar mensaje</>}
                  </button>
                )}

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
                      onClick={generate}
                      disabled={generating}
                      className="text-slate-400 text-sm flex items-center gap-1.5 mx-auto hover:text-white transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                      {generating ? "Regenerando..." : `Regenerar (${getTonoById(tono).label})`}
                    </button>

                    {/* Selector modo imagen: Póster (wow) vs Simple */}
                    <div className="bg-slate-800/80 rounded-2xl p-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImageMode("poster")}
                        className={`text-sm font-bold py-2 rounded-xl transition-all ${imageMode === "poster" ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg" : "bg-slate-900/50 text-slate-300 hover:bg-slate-700"}`}
                      >
                        ✨ Póster diseñado
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode("simple")}
                        className={`text-sm font-bold py-2 rounded-xl transition-all ${imageMode === "simple" ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg" : "bg-slate-900/50 text-slate-300 hover:bg-slate-700"}`}
                      >
                        📷 Foto simple
                      </button>
                    </div>

                    {imageMode === "poster" ? (
                      <PosterDesigner value={imageUrl} onChange={setImageUrl} contentType={selectedType} />
                    ) : (
                      <ImageGenerator value={imageUrl} onChange={setImageUrl} suggestedPrompt={typeConfig?.title} />
                    )}

                    <button
                      onClick={publishNow}
                      disabled={publishing}
                      className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-60 text-white font-black text-lg py-5 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                    >
                      {publishing ? <><Loader2 className="w-6 h-6 animate-spin" /> Publicando...</> : <><Send className="w-6 h-6" /> ✈️ Publicar AHORA en Telegram</>}
                    </button>

                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-slate-700" />
                      <span className="text-slate-500 text-xs">O TAMBIÉN</span>
                      <div className="flex-1 h-px bg-slate-700" />
                    </div>

                    <button
                      onClick={copyForWhatsApp}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-base py-3.5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                    >
                      {copied ? <><Check className="w-5 h-5" /> ¡Copiado! Abriendo WhatsApp...</> : <><Copy className="w-5 h-5" /> 📋 Copiar para WhatsApp</>}
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