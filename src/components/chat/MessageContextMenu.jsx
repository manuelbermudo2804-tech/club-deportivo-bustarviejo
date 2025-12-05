import React, { useState } from "react";
import { Copy, Trash2, Reply, SmilePlus, X } from "lucide-react";
import { toast } from "sonner";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageContextMenu({ 
  message, 
  isOwnMessage, 
  onDelete, 
  onReply, 
  onReact,
  onClose,
  position, // { x, y }
  showReplyOption = true,
  replyLabel = "Responder"
}) {
  const [showReactions, setShowReactions] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.mensaje || "");
    toast.success("📋 Mensaje copiado");
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    onClose();
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
    onClose();
  };

  const handleReaction = (emoji) => {
    if (onReact) {
      onReact(message.id, emoji);
    }
    onClose();
  };

  // Calcular posición para que no se salga de la pantalla
  const menuStyle = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.min(position.y, window.innerHeight - 250),
    zIndex: 1000
  };

  return (
    <>
      {/* Overlay para cerrar */}
      <div 
        className="fixed inset-0 z-[999]" 
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      
      {/* Menú */}
      <div 
        style={menuStyle}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Reacciones rápidas */}
        {showReactions ? (
          <div className="p-2 border-b bg-slate-50">
            <div className="flex items-center gap-1">
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-200 rounded-full transition-all hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setShowReactions(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-200 rounded-full ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 border-b bg-slate-50">
            <div className="flex items-center gap-1">
              {REACTIONS.slice(0, 6).map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-200 rounded-full transition-all hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opciones */}
        <div className="py-1">
          {showReplyOption && (
            <button
              onClick={handleReply}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-green-50 transition-colors text-left"
            >
              <Reply className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{replyLabel}</span>
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <Copy className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Copiar</span>
          </button>

          {isOwnMessage && onDelete && (
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">Eliminar</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}