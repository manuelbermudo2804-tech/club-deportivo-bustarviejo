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
      <div className="bg-slate-800/80 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
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
    <div className="bg-slate-800/80 rounded-2xl p-3 space-y-2">
      <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" /> Imagen (opcional)
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe la imagen que quieres (ej: jugadores celebrando un gol bajo la lluvia)"
        className="w-full min-h-[60px] p-2 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 resize-y focus:ring-2 focus:ring-purple-500"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={generating || !prompt.trim()}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
        >
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><Wand2 className="w-4 h-4" /> Generar IA</>}
        </button>
        <label className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Subir foto</>}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}