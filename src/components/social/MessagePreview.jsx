import React from "react";

export default function MessagePreview({ text, imageUrl, editing, onChange, onStartEdit, onStopEdit }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="ml-auto max-w-[95%] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
          <span className="text-xs font-semibold text-slate-600">Vista previa del mensaje</span>
          <button type="button" onClick={editing ? onStopEdit : onStartEdit} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50">
            {editing ? "Terminar edición" : "Editar texto"}
          </button>
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Imagen del post"
            className="w-full h-auto object-cover max-h-72"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="p-3">
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => onChange(e.target.value)}
              className="w-full min-h-[150px] resize-y rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              autoFocus
              onBlur={onStopEdit}
            />
          ) : (
            <div
              onClick={onStartEdit}
              className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 cursor-text"
            >
              {text}
            </div>
          )}
          {!editing && (
            <p className="mt-2 text-right text-[10px] text-slate-500">También puedes pulsar directamente sobre el mensaje.</p>
          )}
        </div>
      </div>
    </div>
  );
}