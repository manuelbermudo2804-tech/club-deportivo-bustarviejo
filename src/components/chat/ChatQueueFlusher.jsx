import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { flushChatQueue } from "@/lib/chatQueue";

// Envía en segundo plano los mensajes que se quedaron sin enviar por falta de cobertura
export default function ChatQueueFlusher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const run = async () => {
      const sent = await flushChatQueue();
      if (sent > 0) {
        queryClient.invalidateQueries({ queryKey: ["coachGroupMessages"] });
        queryClient.invalidateQueries({ queryKey: ["coachParentChatMessages"] });
        toast.success(sent === 1 ? "Mensaje pendiente enviado" : `${sent} mensajes pendientes enviados`);
      }
    };
    run();
    const interval = setInterval(run, 15000);
    window.addEventListener("online", run);
    return () => { clearInterval(interval); window.removeEventListener("online", run); };
  }, [queryClient]);

  return null;
}