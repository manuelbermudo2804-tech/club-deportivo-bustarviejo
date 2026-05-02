import React from "react";

export default function MessagePreview({ text, imageUrl, editing, onChange, onStartEdit, onStopEdit }) {
  return (
    <div className="bg-[#0e1621] rounded-2xl p-3 shadow-inner border border-slate-700/50">
      <div className="bg-[#182533] rounded-xl overflow-hidden shadow max-w-[95%] ml-auto">
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
              className="w-full min-h-[150px] p-2 bg-slate-900 text-slate-100 rounded-lg text-sm resize-y border-0 focus:ring-1 focus:ring-sky-500"
              autoFocus
              onBlur={onStopEdit}
            />
          ) : (
            <div
              onClick={onStartEdit}
              className="whitespace-pre-wrap text-sm text-slate-100 cursor-text leading-relaxed"
            >
              {text}
            </div>
          )}
          {!editing && (
            <p className="text-[10px] text-slate-500 mt-1 text-right">Toca para editar</p>
          )}
        </div>
      </div>
    </div>
  );
}