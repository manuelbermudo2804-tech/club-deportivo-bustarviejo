import React from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Acciones rápidas que aparecen al pasar/pulsar un mensaje: Copiar y Borrar.
 * - Copiar: disponible en cualquier mensaje con texto.
 * - Borrar: solo si es mensaje propio (isMine) y se pasa onDelete.
 * Los iconos aparecen al hacer hover sobre el grupo (.group del contenedor padre).
 */
export default function MessageQuickActions({ text, isMine, onDelete, dark = false }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success("Mensaje copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const tone = dark ? "text-white" : "text-slate-600";

  return (
    <div className="flex gap-0.5">
      {text && (
        <button
          onClick={handleCopy}
          title="Copiar"
          className={`opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded hover:bg-black/10 ${tone}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
      {isMine && typeof onDelete === "function" && (
        <button
          onClick={onDelete}
          title="Borrar"
          className={`opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded hover:bg-red-500/20 text-red-500`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}