import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Wand2, Copy, Check, ArrowLeft, MessageCircle, RefreshCw,
  Clock, Send, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/es";

import SocialOpportunitiesBanner from "@/components/social/SocialOpportunitiesBanner";
import ContentTypeGrid from "@/components/social/ContentTypeGrid";
import ToneSelector from "@/components/social/ToneSelector";
import MessagePreview from "@/components/social/MessagePreview";
import AutoPosterRenderer from "@/components/social/AutoPosterRenderer";
import { CONTENT_TYPES, getContentTypeById, getTonoById } from "@/components/social/contentTypes";
import { fetchDataForType } from "@/components/social/fetchContentData";
import { suggestTemplate, getPosterTemplate } from "@/components/social/posterTemplates";

moment.locale('es');

// ─── Prompt unificado: pide al LLM texto + campos del póster en JSON ───
const buildUnifiedPrompt = (typeLabel, datos, tonoId, templateId) => {
  const tono = getTonoById(tonoId);
  const template = getPosterTemplate(templateId);
  const fieldsList = template.fields.join(", ");
  return `Eres el community manager del CD Bustarviejo (fútbol base, Sierra Norte de Madrid).

${tono.promptHint}

Tu tarea: generar 2 cosas a partir de los DATOS:

1) "mensaje" (string): Texto para Telegram/WhatsApp.
   - Menciona "CD Bustarviejo" al menos una vez
   - Saltos de línea claros, fácil de leer
   - ${tonoId === 'corto' ? 'MÁX 200 caracteres' : tonoId === 'epico' ? 'MÁX 700 caracteres' : 'MÁX 600 caracteres'}
   - ${tonoId !== 'pro' ? 'Emojis con criterio' : 'Emojis mínimos, estilo prensa'}
   - NO hashtags, NO inventes datos
   - Si hay victoria → celebra; si hay derrota → anima
   - Primera línea: emoji + título en mayúsculas (excepto tono pro)

2) "poster" (object): Campos para diseñar un póster visual con plantilla "${template.label}".
   Campos a rellenar (en MAYÚSCULAS, MUY CORTOS, impactantes):
   ${fieldsList}
   Reglas:
   - Textos cortos y contundentes, en MAYÚSCULAS, sin emojis dentro
   - "title": máximo 4 palabras
   - "subtitle": máximo 8 palabras
   - "badge": 1-2 palabras (ej: "RESULTADO", "URGENTE", "FINDE")
   - "body": frase corta (máximo 12 palabras)
   - "cta": 2-4 palabras (ej: "APÚNTATE YA", "VEN AL CAMPO")
   - "team1"/"team2": nombre del equipo en MAYÚSCULAS, corto
   - "score1"/"score2": solo el número
   - "date": formato corto (ej: "SÁB 10 MAY")
   - "time": formato 24h (ej: "11:00")
   - "venue": nombre del campo, MUY corto
   - "category": categoría en MAYÚSCULAS, corta (ej: "ALEVÍN A")
   - "quote": frase potente, máximo 12 palabras
   - "author": nombre o "CD BUSTARVIEJO"
   - "day"/"month": día y mes en MAYÚSCULAS
   - "description": 1 frase corta

3) "fondo" (string): Descripción CORTA en español del fondo ideal para este póster (atmósfera, no objetos concretos). Ej: "Campo de fútbol al atardecer con luz cálida, montañas al fondo".

TIPO: ${typeLabel}

DATOS:
${datos}

Responde SOLO con un JSON válido con esta estructura:
{
  "mensaje": "...",
  "poster": { "title": "...", ... },
  "fondo": "..."
}`;
};

const responseSchema = {
  type: "object",
  properties: {
    mensaje: { type: "string" },
    poster: { type: "object" },
    fondo: { type: "string" },
  },
  required: ["mensaje", "poster"],
};

export default function SocialHub() {
  const queryClient = useQueryClient();

  const [view, setView] = useState('menu');
  const [selectedType, setSelectedType] = useState(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [datos, setDatos] = useState("");
  const [text, setText] = useState("");
  const [tono, setTono] = useState("cercano");
  const [editing, setEditing] = useState(false);
  const [showDatos, setShowDatos] = useState(false);

  // Póster automático
  const [templateId, setTemplateId] = useState(null);
  const [posterFields, setPosterFields] = useState({});
  const [bgImage, setBgImage] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);

  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["socialPosts"],
    queryFn: () => base44.entities.SocialPost.list("-created_date", 30),
    staleTime: 60000,
  });

  const typeConfig = getContentTypeById(selectedType);

  const resetEditor = () => {
    setText(""); setDatos(""); setTono("cercano"); setEditing(false);
    setTemplateId(null); setPosterFields({}); setBgImage(null); setPosterUrl(null);
    setShowDatos(false);
  };

  const selectType = async (type) => {
    setSelectedType(type);
    resetEditor();
    setView('editor');
    setLoading(true);
    const d = await fetchDataForType(type);
    setDatos(d);
    setLoading(false);
    // Auto-generar todo al entrar
    setTimeout(() => generateAll(d, type), 100);
  };

  const selectOpportunity = (opp) => {
    const type = opp.socialType || opp.type;
    setSelectedType(type);
    resetEditor();
    setView('editor');
    setDatos(opp.datos || "");
    setTimeout(() => generateAll(opp.datos || "", type), 100);
  };

  const goBackToMenu = () => {
    setView('menu');
    setSelectedType(null);
    resetEditor();
  };

  // Genera fondo IA en paralelo
  const generateBackground = async (description) => {
    setGeneratingBg(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `${description}. Estilo cinematográfico, atmosférico, alta calidad, sin texto, sin logos, sin caras. Para usar como fondo de póster deportivo del CD Bustarviejo.`,
      });
      if (result?.url) setBgImage(result.url);
    } catch (e) {
      console.error("Error generando fondo:", e);
    }
    setGeneratingBg(false);
  };

  // Genera TODO automáticamente: texto + campos del póster + fondo
  const generateAll = async (datosToUse, typeToUse, customTemplateId = null) => {
    const finalDatos = datosToUse || datos;
    const finalType = typeToUse || selectedType;
    if (!finalDatos.trim()) return;

    const tplId = customTemplateId || suggestTemplate(finalType);
    setTemplateId(tplId);
    setPosterUrl(null);
    setGenerating(true);

    try {
      const typeLabel = getContentTypeById(finalType)?.title || finalType;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildUnifiedPrompt(typeLabel, finalDatos, tono, tplId),
        response_json_schema: responseSchema,
      });

      if (result?.mensaje) setText(result.mensaje);
      if (result?.poster) setPosterFields(result.poster);
      if (result?.fondo) {
        // Generar fondo en paralelo (no bloquea el render del póster)
        generateBackground(result.fondo);
      }
    } catch (e) {
      toast.error("Error al generar");
      console.error(e);
    }
    setGenerating(false);
  };

  // Cambiar plantilla (regenera con otra)
  const cycleTemplate = () => {
    const order = ["hero", "result", "match", "announcement", "quote", "event"];
    const current = order.indexOf(templateId);
    const next = order[(current + 1) % order.length];
    generateAll(null, null, next);
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
        image_url: posterUrl,
        parse_mode: "HTML",
      });
      if (data?.success) {
        toast.success("✈️ ¡Publicado en Telegram!");
        await base44.entities.SocialPost.create({
          tipo: selectedType, titulo,
          contenido_whatsapp: text, tono,
          imagen_url: posterUrl,
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
        contenido_whatsapp: text, tono,
        imagen_url: posterUrl,
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
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-orange-400/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Centro de Difusión Social
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            <span className="text-orange-400 font-semibold">100% automático</span> · IA + póster + Telegram
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

            {loading || (generating && !text) ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="w-12 h-12 animate-spin text-orange-400" />
                <p className="text-slate-300 mt-4 text-sm font-bold">
                  {loading ? "Cargando datos del club..." : "✨ Generando texto y póster..."}
                </p>
                <p className="text-slate-500 mt-1 text-xs">Esto suele tardar 5-10 segundos</p>
              </div>
            ) : (
              <>
                {/* Tipo seleccionado */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${typeConfig?.gradient} text-white font-bold`}>
                    {typeConfig?.title}
                  </span>
                  <button
                    onClick={() => setShowDatos(s => !s)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    {showDatos ? "Ocultar datos" : "Ver/editar datos"}
                  </button>
                </div>

                {/* Datos (oculto por defecto) */}
                {showDatos && (
                  <div className="bg-slate-800/80 rounded-2xl p-3">
                    <p className="text-slate-400 text-xs font-bold mb-2">📝 Datos usados por la IA</p>
                    <textarea
                      value={datos}
                      onChange={(e) => setDatos(e.target.value)}
                      className="w-full min-h-[80px] p-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-slate-200 resize-y focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => generateAll(datos, selectedType)}
                      disabled={generating}
                      className="w-full mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
                      Regenerar con estos datos
                    </button>
                  </div>
                )}

                {/* Selector de tono */}
                <ToneSelector value={tono} onChange={(v) => { setTono(v); generateAll(datos, selectedType); }} />

                {text && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Preview del mensaje (texto) */}
                    <MessagePreview
                      text={text}
                      imageUrl={posterUrl}
                      editing={editing}
                      onChange={setText}
                      onStartEdit={() => setEditing(true)}
                      onStopEdit={() => setEditing(false)}
                    />

                    {/* Póster automático */}
                    {templateId && Object.keys(posterFields).length > 0 && (
                      <AutoPosterRenderer
                        templateId={templateId}
                        fields={posterFields}
                        bgImage={bgImage}
                        onRendered={setPosterUrl}
                        onRegenerate={cycleTemplate}
                        regenerating={generating}
                      />
                    )}

                    {generatingBg && (
                      <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Generando fondo IA en paralelo...
                      </p>
                    )}

                    {/* Botón publicar */}
                    <button
                      onClick={publishNow}
                      disabled={publishing || !posterUrl}
                      className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-60 text-white font-black text-lg py-5 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                    >
                      {publishing ? (
                        <><Loader2 className="w-6 h-6 animate-spin" /> Publicando...</>
                      ) : !posterUrl ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Esperando póster...</>
                      ) : (
                        <><Send className="w-6 h-6" /> ✈️ Publicar AHORA en Telegram</>
                      )}
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