import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Wand2, X, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ImageGenerator({ value, onChange, suggestedPrompt }) {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prompt, setPrompt] = useState(suggestedPrompt || "");

  const generate = async () => {
    if (!prompt.trim()) { toast.error("Escribe primero qué quieres ver en la imagen"); return; }
    setGenerating(true);
    try {
      const fullPrompt = `${prompt}. Estilo: deportivo, fútbol base, ambiente español de pueblo, colores naranja y verde del CD Bustarviejo. Imagen cuadrada, alta calidad, sin texto encima.`;
      const result = await base44.integrations.Core.GenerateImage({ prompt: fullPrompt });
      if (result?.url) {
        onChange(result.url);
        toast.success("Imagen generada");
      } else {
        toast.error("No se pudo generar la imagen");
      }
    } catch (e) {
      toast.error("Error al generar la imagen: " + (e?.message || ""));
    }
    setGenerating(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) {
        onChange(file_url);
        toast.success("Imagen subida");
      }
    } catch (err) {
      toast.error("Error al subir la imagen");
    }
    setUploading(false);
    e.target.value = '';
  };

  if (value) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <ImageIcon className="w-3.5 h-3.5" /> Imagen adjunta
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Quitar
          </button>
        </div>
        <img src={value} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
        <ImageIcon className="w-3.5 h-3.5" /> Imagen (opcional)
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe la imagen que quieres (ej: jugadores celebrando un gol bajo la lluvia)"
        className="w-full min-h-[60px] resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={generating || !prompt.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
        >
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><Wand2 className="w-4 h-4" /> Generar IA</>}
        </button>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Subir foto</>}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}