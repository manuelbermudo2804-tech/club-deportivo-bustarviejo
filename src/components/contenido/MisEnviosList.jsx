import React from "react";
import moment from "moment";

const ESTADO_TEXTO = {
  pendiente: { txt: "El club lo está revisando", color: "text-slate-500" },
  guardado: { txt: "Guardado para publicar 👌", color: "text-blue-600" },
  publicado: { txt: "¡Publicado! 🎉", color: "text-green-600" },
  descartado: { txt: "No se usará esta vez", color: "text-slate-400" },
};

export default function MisEnviosList({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="font-bold text-slate-800 mb-3">Lo que has enviado</p>
      <div className="space-y-2">
        {items.map((it) => {
          const est = ESTADO_TEXTO[it.estado] || ESTADO_TEXTO.pendiente;
          return (
            <div key={it.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-2">
              <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xl">
                {it.tipo === "video" ? "🎥" : (
                  <img src={it.archivo_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 truncate">{it.descripcion || it.equipo}</p>
                <p className={`text-xs font-semibold ${est.color}`}>{est.txt}</p>
              </div>
              <span className="text-xs text-slate-400">{moment(it.created_date).format("DD/MM")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}