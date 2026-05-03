import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import html2canvas from "html2canvas";
import { Loader2, Wand2, Image as ImageIcon, Upload, X, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { POSTER_TEMPLATES, getPosterTemplate, suggestTemplate } from "./posterTemplates";

export default function PosterDesigner({ value, onChange, contentType, autoFields = {} }) {
  const [templateId, setTemplateId] = useState(suggestTemplate(contentType));
  const [bgImage, setBgImage] = useState(null);
  const [bgPrompt, setBgPrompt] = useState("");
  const [generatingBg, setGeneratingBg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [fields, setFields] = useState(autoFields);
  const previewRef = useRef(null);

  // Resetear cuando cambia el tipo de contenido
  useEffect(() => {
    setTemplateId(suggestTemplate(contentType));
    setFields(autoFields);
  }, [contentType]);

  const template = getPosterTemplate(templateId);
  const TemplateComponent = template.component;

  const generateBg = async () => {
    const prompt = bgPrompt.trim() || `Fondo deportivo épico para CD Bustarviejo, fútbol base, ${contentType || 'club'}, atardecer, montañas Sierra Norte Madrid, atmosférico, cinematográfico, sin texto, sin logos`;
    setGeneratingBg(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `${prompt}. Imagen vertical o cuadrada, alta calidad, atmósfera oscura para overlay, sin texto, sin caras reconocibles, sin logos.`,
      });
      if (result?.url) {
        setBgImage(result.url);
        toast.success("Fondo generado");
      }
    } catch (e) {
      toast.error("Error generando fondo");
    }
    setGeneratingBg(false);
  };

  const handleUploadBg = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) { setBgImage(file_url); toast.success("Foto subida"); }
    } catch { toast.error("Error subiendo foto"); }
    setUploading(false);
    e.target.value = '';
  };

  const renderPoster = async () => {
    if (!previewRef.current) return;
    setRendering(true);
    try {
      // Esperar a que la imagen de fondo cargue
      const imgs = previewRef.current.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));

      const canvas = await html2canvas(previewRef.current, {
        useCORS: true, allowTaint: true, backgroundColor: null,
        scale: 1, width: 1080, height: 1080,
      });
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
      if (!blob) throw new Error("No se pudo generar");
      const file = new File([blob], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success("✨ Póster listo");
    } catch (e) {
      toast.error("Error generando el póster: " + (e?.message || ""));
    }
    setRendering(false);
  };

  const updateField = (key, val) => setFields(prev => ({ ...prev, [key]: val }));

  if (value) {
    return (
      <div className="bg-slate-800/80 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Póster generado
          </p>
          <button onClick={() => onChange(null)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Cambiar
          </button>
        </div>
        <img src={value} alt="Póster" className="w-full max-h-96 object-contain rounded-xl bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 rounded-2xl p-3 space-y-3">
      <p className="text-slate-300 text-sm font-bold flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-orange-400" /> Diseñador de Póster
      </p>

      {/* Selector de plantilla */}
      <div>
        <p className="text-slate-400 text-xs font-bold mb-2">1. Elige plantilla</p>
        <div className="grid grid-cols-2 gap-2">
          {POSTER_TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={`text-left rounded-xl px-2.5 py-2 transition-all border ${templateId === t.id ? "bg-gradient-to-br from-orange-600 to-red-600 border-orange-400 shadow-lg" : "bg-slate-900/60 border-slate-700 hover:border-slate-500"}`}
            >
              <div className="font-bold text-white text-sm">{t.label}</div>
              <div className="text-[10px] text-slate-300 mt-0.5 leading-tight">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Campos editables */}
      <div>
        <p className="text-slate-400 text-xs font-bold mb-2">2. Rellena los textos</p>
        <div className="space-y-1.5">
          {template.fields.map(f => (
            <input
              key={f}
              type="text"
              value={fields[f] || ""}
              onChange={(e) => updateField(f, e.target.value)}
              placeholder={fieldPlaceholder(f)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500"
            />
          ))}
        </div>
      </div>

      {/* Fondo */}
      <div>
        <p className="text-slate-400 text-xs font-bold mb-2">3. Fondo (opcional)</p>
        <textarea
          value={bgPrompt}
          onChange={(e) => setBgPrompt(e.target.value)}
          placeholder="Describe el fondo (ej: campo de fútbol al atardecer, gradas llenas)"
          className="w-full min-h-[50px] p-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 resize-y focus:ring-2 focus:ring-orange-500"
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button type="button" onClick={generateBg} disabled={generatingBg} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5">
            {generatingBg ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</> : <><Wand2 className="w-3.5 h-3.5" /> Generar fondo IA</>}
          </button>
          <label className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
            {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...</> : <><Upload className="w-3.5 h-3.5" /> Subir foto</>}
            <input type="file" accept="image/*" onChange={handleUploadBg} className="hidden" disabled={uploading} />
          </label>
        </div>
        {bgImage && (
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
            <img src={bgImage} alt="" className="w-12 h-12 object-cover rounded" />
            <span className="flex-1">Fondo cargado</span>
            <button onClick={() => setBgImage(null)} className="text-red-400">Quitar</button>
          </div>
        )}
      </div>

      {/* Preview ESCALADO */}
      <div>
        <p className="text-slate-400 text-xs font-bold mb-2">4. Vista previa</p>
        <div className="relative bg-slate-900 rounded-xl overflow-hidden flex justify-center" style={{ height: 320 }}>
          <div style={{ transform: "scale(0.296)", transformOrigin: "top center", width: 1080, height: 1080 }}>
            <div ref={previewRef}>
              <TemplateComponent {...fields} bgImage={bgImage} />
            </div>
          </div>
        </div>
      </div>

      {/* Generar imagen final */}
      <button
        type="button"
        onClick={renderPoster}
        disabled={rendering}
        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 text-white font-black text-base py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]"
      >
        {rendering ? <><Loader2 className="w-5 h-5 animate-spin" /> Generando póster...</> : <><Sparkles className="w-5 h-5" /> ✨ Generar póster final</>}
      </button>
    </div>
  );
}

function fieldPlaceholder(f) {
  const map = {
    title: "Título principal (mayúsculas, corto)",
    subtitle: "Subtítulo o frase secundaria",
    badge: "Etiqueta superior (ej: NOTICIA, URGENTE)",
    body: "Cuerpo del mensaje",
    cta: "Llamada a la acción (ej: APÚNTATE YA)",
    team1: "Equipo 1 (ej: CD BUSTARVIEJO)",
    team2: "Equipo 2 (ej: CF RIVAL)",
    score1: "Goles equipo 1",
    score2: "Goles equipo 2",
    category: "Categoría (ej: ALEVÍN)",
    jornada: "Nº jornada",
    date: "Fecha (ej: SÁB 10 MAY)",
    time: "Hora (ej: 11:00)",
    venue: "Campo / lugar",
    quote: "Frase / cita",
    author: "Autor de la cita",
    day: "Día (ej: 15)",
    month: "Mes (ej: MAYO)",
    description: "Descripción breve",
  };
  return map[f] || f;
}