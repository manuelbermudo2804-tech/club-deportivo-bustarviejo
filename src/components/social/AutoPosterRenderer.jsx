import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import html2canvas from "html2canvas";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { getPosterTemplate } from "./posterTemplates";

/**
 * Renderiza un póster automáticamente:
 * - Recibe templateId + fields + bgImage
 * - Hace render con html2canvas y devuelve la URL via onRendered
 * - Muestra una preview escalada
 */
export default function AutoPosterRenderer({ templateId, fields, bgImage, onRendered, onRegenerate, regenerating }) {
  const previewRef = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState(null);
  const renderKeyRef = useRef("");

  const template = getPosterTemplate(templateId);
  const TemplateComponent = template.component;

  useEffect(() => {
    // Construye una clave única para evitar renders duplicados
    const key = JSON.stringify({ templateId, fields, bgImage });
    if (renderKeyRef.current === key) return;
    renderKeyRef.current = key;

    let cancelled = false;
    const doRender = async () => {
      if (!previewRef.current) return;
      setRendering(true);
      try {
        // esperar imágenes
        const imgs = previewRef.current.querySelectorAll('img');
        await Promise.all(Array.from(imgs).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 3000); })));
        if (cancelled) return;
        const canvas = await html2canvas(previewRef.current, {
          useCORS: true, allowTaint: true, backgroundColor: null,
          scale: 1, width: 1080, height: 1080, logging: false,
        });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
        if (!blob || cancelled) return;
        const file = new File([blob], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        if (cancelled) return;
        setRenderedUrl(file_url);
        onRendered?.(file_url);
      } catch (e) {
        console.error("Error rendering poster:", e);
      }
      if (!cancelled) setRendering(false);
    };

    // Pequeño delay para asegurar que el DOM está listo
    const t = setTimeout(doRender, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [templateId, JSON.stringify(fields), bgImage]);

  return (
    <div className="bg-slate-800/80 rounded-2xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-slate-300 text-sm font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-orange-400" />
          Póster automático
          {rendering && <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />}
        </p>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating || rendering}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
            Otro estilo
          </button>
        )}
      </div>

      {/* Preview escalada */}
      <div className="relative bg-slate-900 rounded-xl overflow-hidden flex justify-center" style={{ height: 360 }}>
        <div style={{ transform: "scale(0.333)", transformOrigin: "top center", width: 1080, height: 1080 }}>
          <div ref={previewRef}>
            <TemplateComponent {...fields} bgImage={bgImage} />
          </div>
        </div>
        {rendering && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
            <div className="bg-slate-900/90 rounded-xl px-4 py-2 text-white text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Generando póster...
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500 text-center">
        Generado automáticamente · Plantilla "{template.label}"
      </p>
    </div>
  );
}