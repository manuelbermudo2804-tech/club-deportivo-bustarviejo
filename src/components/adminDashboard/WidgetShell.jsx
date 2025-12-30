import React from "react";
import { X, GripHorizontal } from "lucide-react";

export default function WidgetShell({ title, children, editMode, onRemove }) {
  return (
    <div className={`relative ${editMode ? "ring-2 ring-orange-400 rounded-xl" : ""}`}>
      {editMode && (
        <div className="absolute -top-2 -left-2 bg-white rounded-lg shadow px-2 py-1 text-xs text-slate-600 flex items-center gap-1">
          <GripHorizontal className="w-3 h-3" /> Mover
        </div>
      )}
      {editMode && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
          title="Quitar"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {children}
    </div>
  );
}