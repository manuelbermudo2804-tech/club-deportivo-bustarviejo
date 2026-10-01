import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { pendingChatCount, CHAT_QUEUE_EVENT } from "@/lib/chatQueue";

export default function ChatPendingBanner({ grupoId }) {
  const [count, setCount] = useState(() => pendingChatCount(grupoId));

  useEffect(() => {
    const update = () => setCount(pendingChatCount(grupoId));
    update();
    window.addEventListener(CHAT_QUEUE_EVENT, update);
    return () => window.removeEventListener(CHAT_QUEUE_EVENT, update);
  }, [grupoId]);

  if (!count) return null;
  return (
    <div className="flex items-center gap-2 bg-orange-100 border-t border-orange-300 text-orange-900 text-sm px-3 py-2">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>
        <b>{count === 1 ? "1 mensaje pendiente" : `${count} mensajes pendientes`}</b> por falta de cobertura.
        Está guardado y se enviará solo al volver la señal. No hace falta repetirlo.
      </span>
    </div>
  );
}