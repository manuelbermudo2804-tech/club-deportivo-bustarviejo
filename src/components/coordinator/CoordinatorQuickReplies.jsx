import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Plus, X } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_REPLIES = [
  { texto: "✅ Revisando tu consulta, te respondo pronto", emoji: "✅" },
  { texto: "📅 Te confirmo mañana", emoji: "📅" },
  { texto: "👍 Entendido, gracias por avisar", emoji: "👍" },
  { texto: "📞 Te llamaré para comentarlo", emoji: "📞" },
  { texto: "✨ Perfecto, todo aclarado", emoji: "✨" },
];

export default function CoordinatorQuickReplies({ onSelect, user }) {
  const [showConfig, setShowConfig] = useState(false);
  const [customReplies, setCustomReplies] = useState([]);
  const [newReply, setNewReply] = useState("");

  const { data: settings } = useQuery({
    queryKey: ['coordinatorSettings', user?.email],
    queryFn: async () => {
      const all = await base44.entities.CoordinatorSettings.filter({ coordinador_email: user.email });
      return all[0] || null;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (settings?.plantillas_respuesta) {
      setCustomReplies(settings.plantillas_respuesta);
    }
  }, [settings]);

  const queryClient = useQueryClient();

  const saveRepliesMutation = useMutation({
    mutationFn: async (replies) => {
      if (settings?.id) {
        await base44.entities.CoordinatorSettings.update(settings.id, {
          plantillas_respuesta: replies
        });
      } else {
        await base44.entities.CoordinatorSettings.create({
          coordinador_email: user.email,
          plantillas_respuesta: replies
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorSettings'] });
      toast.success("Plantillas guardadas");
    },
  });

  const addCustomReply = () => {
    if (!newReply.trim()) return;
    const updated = [...customReplies, { texto: newReply, emoji: "💬" }];
    setCustomReplies(updated);
    saveRepliesMutation.mutate(updated);
    setNewReply("");
  };

  const removeCustomReply = (index) => {
    const updated = customReplies.filter((_, i) => i !== index);
    setCustomReplies(updated);
    saveRepliesMutation.mutate(updated);
  };

  const allReplies = [...DEFAULT_REPLIES, ...customReplies];

  return (
    <>
      <div className="mb-2 bg-white border rounded-lg shadow-lg p-2 space-y-1 max-h-[300px] overflow-y-auto">
        <div className="flex items-center justify-between mb-2 sticky top-0 bg-white pb-1 border-b">
          <p className="text-xs font-bold text-slate-700">Respuestas Rápidas</p>
          <Button size="sm" variant="ghost" onClick={() => setShowConfig(true)}>
            <Settings className="w-3 h-3" />
          </Button>
        </div>
        {allReplies.map((reply, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(reply.texto)}
            className="block w-full text-left text-xs p-2 hover:bg-slate-50 rounded transition-colors"
          >
            {reply.emoji} {reply.texto}
          </button>
        ))}
      </div>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚙️ Configurar Plantillas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm font-bold text-slate-700 mb-2">📋 Plantillas por defecto</p>
              <div className="space-y-1">
                {DEFAULT_REPLIES.map((r, i) => (
                  <p key={i} className="text-xs text-slate-600">{r.emoji} {r.texto}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">✨ Tus plantillas personalizadas</p>
              {customReplies.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No tienes plantillas personalizadas</p>
              ) : (
                <div className="space-y-2">
                  {customReplies.map((reply, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                      <p className="text-xs flex-1">{reply.emoji} {reply.texto}</p>
                      <Button size="sm" variant="ghost" onClick={() => removeCustomReply(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">➕ Añadir nueva plantilla</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: Te llamo mañana para hablarlo"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="text-sm"
                />
                <Button onClick={addCustomReply} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}