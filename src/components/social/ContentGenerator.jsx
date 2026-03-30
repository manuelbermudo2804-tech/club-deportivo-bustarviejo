import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Copy, Instagram, MessageCircle, Check, Loader2, Wand2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const TABS = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "bg-green-500" },
  { key: "instagram", label: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { key: "twitter", label: "X / Twitter", icon: Send, color: "bg-sky-500" },
];

export default function ContentGenerator({ tipo, titulo, datosParaIA, onSaved }) {
  const [generating, setGenerating] = useState(false);
  const [contents, setContents] = useState({ whatsapp: "", instagram: "", twitter: "" });
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [copied, setCopied] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const generateContent = async () => {
    setGenerating(true);
    try {
      const prompt = `Eres el community manager del CD Bustarviejo, un club de fútbol amateur de la Sierra Norte de Madrid.

Genera contenido para REDES SOCIALES del club a partir de estos datos:

TIPO: ${titulo}
DATOS:
${datosParaIA}

Genera 3 versiones del mismo contenido:

1. **WhatsApp** (para un Canal de WhatsApp del club):
   - Usa emojis abundantes
   - Formato limpio con saltos de línea
   - Incluye datos clave (horarios, campos, rivales, resultados)
   - Tono cercano y entusiasta
   - Máximo 500 caracteres si es posible

2. **Instagram** (para caption de un post):
   - Emojis moderados
   - Tono más visual y motivador
   - Incluye hashtags relevantes (#CDbustarviejo #FútbolBase #SierraNorte etc.)
   - CTA al final (síguenos, enlace en bio, etc.)

3. **Twitter/X** (para un tweet):
   - Máximo 280 caracteres
   - Directo y conciso
   - 2-3 hashtags máximo
   - Incluye datos esenciales

IMPORTANTE: 
- El club se llama "CD Bustarviejo" o "C.D. Bustarviejo"
- Usa el tono de un club familiar, cercano, de pueblo
- NO inventes datos que no te he dado
- Si hay resultados, celebra las victorias y anima en las derrotas`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            whatsapp: { type: "string", description: "Texto para WhatsApp" },
            instagram: { type: "string", description: "Texto para Instagram" },
            twitter: { type: "string", description: "Texto para Twitter/X (máx 280 chars)" },
          },
        },
      });

      setContents({
        whatsapp: result.whatsapp || "",
        instagram: result.instagram || "",
        twitter: result.twitter || "",
      });
    } catch (e) {
      console.error("Error generating:", e);
      toast.error("Error al generar contenido");
    }
    setGenerating(false);
  };

  const copyToClipboard = (text, platform) => {
    navigator.clipboard.writeText(text);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copiado al portapapeles");
  };

  const shareToWhatsApp = (text) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const saveAndMarkSent = async (platform) => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.SocialPost.create({
        tipo,
        titulo,
        contenido_whatsapp: contents.whatsapp,
        contenido_instagram: contents.instagram,
        contenido_twitter: contents.twitter,
        [`enviado_${platform}`]: true,
        datos_origen: datosParaIA?.substring(0, 2000),
        creado_por: user.email,
      });
      toast.success(`Guardado como enviado a ${platform}`);
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const hasContent = contents.whatsapp || contents.instagram || contents.twitter;

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{titulo}</CardTitle>
          <Button
            onClick={generateContent}
            disabled={generating}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Generando...</>
            ) : hasContent ? (
              <><RefreshCw className="w-4 h-4 mr-1" /> Regenerar</>
            ) : (
              <><Wand2 className="w-4 h-4 mr-1" /> Generar con IA</>
            )}
          </Button>
        </div>
      </CardHeader>

      {hasContent && (
        <CardContent className="pt-0 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.key
                    ? `${tab.color} text-white shadow`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="relative">
            {editing ? (
              <textarea
                value={contents[activeTab]}
                onChange={(e) => setContents({ ...contents, [activeTab]: e.target.value })}
                className="w-full min-h-[200px] p-3 border rounded-lg text-sm font-mono resize-y"
                autoFocus
                onBlur={() => setEditing(false)}
              />
            ) : (
              <div
                onClick={() => setEditing(true)}
                className="bg-slate-50 rounded-lg p-3 min-h-[120px] whitespace-pre-wrap text-sm cursor-text hover:bg-slate-100 transition-colors"
              >
                {contents[activeTab] || <span className="text-slate-400 italic">Sin contenido para esta red</span>}
              </div>
            )}
            {!editing && contents[activeTab] && (
              <p className="text-[10px] text-slate-400 mt-1">Pulsa sobre el texto para editar</p>
            )}
          </div>

          {/* Actions */}
          {contents[activeTab] && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(contents[activeTab], activeTab)}
                className="gap-1"
              >
                {copied === activeTab ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === activeTab ? "Copiado" : "Copiar"}
              </Button>

              {activeTab === "whatsapp" && (
                <Button
                  size="sm"
                  onClick={() => shareToWhatsApp(contents.whatsapp)}
                  className="gap-1 bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Abrir WhatsApp
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => saveAndMarkSent(activeTab)}
                disabled={saving}
                className="gap-1 ml-auto"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Marcar como enviado
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}