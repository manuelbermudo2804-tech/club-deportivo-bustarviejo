import React from "react";
import { Button } from "@/components/ui/button";

const QUICK_REPLIES = [
  { text: "Entendido ✅", emoji: "✅" },
  { text: "Gracias 🙏", emoji: "🙏" },
  { text: "¿Puedo consultar algo? 🤔", emoji: "🤔" },
  { text: "Perfecto 👍", emoji: "👍" },
  { text: "De acuerdo 👌", emoji: "👌" },
];

export default function QuickReplies({ onSelect, visible }) {
  if (!visible) return null;

  return (
    <div className="p-2 bg-slate-50 border-b">
      <p className="text-xs text-slate-500 mb-2 px-2">💬 Respuestas rápidas:</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_REPLIES.map((reply, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(reply.text)}
            className="h-8 text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
          >
            {reply.text}
          </Button>
        ))}
      </div>
    </div>
  );
}