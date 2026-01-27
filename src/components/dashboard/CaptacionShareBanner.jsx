import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Sparkles, Loader2, Link as LinkIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CaptacionShareBanner({ link }) {
  const targetLink = link || (typeof window !== 'undefined' ? `${window.location.origin}` : '');
  const [loadingAI, setLoadingAI] = useState(false);
  const [messages, setMessages] = useState([
    `📩 Formulario de contacto jugadores: ${targetLink}`,
  ]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const currentMessage = messages[currentIdx] || messages[0];

  const shareWhatsApp = () => {
    const text = encodeURIComponent(currentMessage);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(targetLink);
    toast.success("¡Enlace copiado!");
  };

  const suggestWithAI = async () => {
    try {
      setLoadingAI(true);
      const prompt = `Genera 3 mensajes muy cortos en español para compartir por WhatsApp e invitar a familias a rellenar un formulario de contacto para jugadores.\nRequisitos:\n- Incluye exactamente este enlace: ${targetLink}\n- Tono cercano, 2-3 emojis, máximo 180 caracteres.\n- Sin hashtags ni comillas.\nDevuélvelos en el campo messages como array de strings.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            messages: { type: "array", items: { type: "string" } }
          },
          required: ["messages"]
        }
      });

      const aiMsgs = Array.isArray(res?.messages) && res.messages.length > 0 ? res.messages : null;
      if (aiMsgs) {
        setMessages(aiMsgs);
        setCurrentIdx(0);
        toast.success("3 textos sugeridos por IA listos ✨");
      } else {
        toast.error("No pude generar textos. Intenta de nuevo.");
      }
    } catch (e) {
      toast.error("Error al generar con IA");
    } finally {
      setLoadingAI(false);
    }
  };

  const nextMessage = () => {
    if (messages.length <= 1) return;
    setCurrentIdx((i) => (i + 1) % messages.length);
  };

  return (
    <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-xl p-3 shadow-lg border border-orange-400">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">📣</span>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">Comparte formulario contacto jugadores</p>
            <p className="text-white/90 text-xs truncate flex items-center gap-1">
              <LinkIcon className="w-3 h-3" /> {targetLink}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button onClick={() => window.open(targetLink, '_blank')} className="h-8 px-3 bg-white/20 hover:bg-white/30 text-white">
            <LinkIcon className="w-4 h-4 mr-1" /> Abrir
          </Button>
          <Button onClick={shareWhatsApp} className="bg-green-500 hover:bg-green-600 text-white h-8 px-3">
            <Share2 className="w-4 h-4 mr-1" /> WhatsApp
          </Button>
          <Button variant="outline" onClick={copyLink} className="h-8 px-3 bg-white/90">
            <Copy className="w-4 h-4 mr-1" /> Copiar
          </Button>
          <Button onClick={suggestWithAI} className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loadingAI}>
            {loadingAI ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} IA
          </Button>
        </div>
      </div>

      {/* Mensaje seleccionado (con opción de cambiar) */}
      <div className="mt-2 bg-white/15 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between gap-2">
        <p className="text-white text-xs leading-snug line-clamp-2 flex-1">{currentMessage}</p>
        {messages.length > 1 && (
          <button onClick={nextMessage} className="text-white/90 text-xs underline hover:text-white flex-shrink-0">
            Cambiar
          </button>
        )}
      </div>
    </div>
  );
}