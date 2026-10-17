import React from "react";

export default function MessagePreview({ text, imageUrl, editing, onChange, onStartEdit, onStopEdit }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="ml-auto max-w-[95%] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
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
            <p className="mt-2 text-right text-[10px] text-slate-500">Toca para editar</p>
          )}
        </div>
      </div>
    </div>
  );
}