import React from "react";
import { X, Reply } from "lucide-react";

export default function ReplyPreview({ replyingTo, onCancel }) {
  if (!replyingTo) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
      <Reply className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-blue-700 truncate">
          {replyingTo.remitente_nombre || "Usuario"}
        </p>
        <p className="text-xs text-slate-600 truncate">
          {replyingTo.mensaje || "(Archivo adjunto)"}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="p-1 hover:bg-blue-100 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}