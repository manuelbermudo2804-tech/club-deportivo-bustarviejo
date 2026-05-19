import React from "react";
import { TEMPLATES } from "./landingTemplates";

// Selector visual de plantilla al crear una página nueva.
export default function TemplatePicker({ onPick, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-6 lg:p-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                ¿Qué tipo de página vas a crear?
              </h2>
              <p className="text-slate-500 mt-2">Elige una plantilla. Podrás personalizar todo después.</p>
            </div>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-700 text-2xl leading-none p-2"
            >
              ✕
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t)}
                className="text-left group relative overflow-hidden rounded-2xl border-2 border-slate-200 hover:border-slate-900 hover:shadow-2xl transition-all bg-white"
              >
                <div className={`h-32 bg-gradient-to-br ${t.color} flex items-center justify-center text-6xl`}>
                  {t.emoji}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:translate-x-1 transition-transform">
                    {t.nombre}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{t.descripcion}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              💡 Vas a poder editar absolutamente todo después: textos, imágenes, colores, campos del formulario…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}