import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Users, MessageCircle, Shield, Search, ChevronRight } from "lucide-react";

/**
 * Selector de chat destino tras compartir imágenes.
 *
 * Props:
 *  - user: usuario actual
 *  - uploadedUrls: array de URLs ya subidas a storage
 *  - targets: array de { id, type, title, subtitle, color, url, sender }
 *      sender: async function que recibe (uploadedUrls) y crea el mensaje.
 *
 * Al pulsar un target:
 *  1) Llama a target.sender(uploadedUrls) → crea el mensaje en la entidad correspondiente
 *  2) Navega a target.url (la URL del chat) para que el usuario vea su mensaje enviado.
 */
export default function ChatTargetSelector({ user, uploadedUrls, targets }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(t =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.subtitle || "").toLowerCase().includes(q)
    );
  }, [targets, query]);

  const handlePick = async (target) => {
    if (sending) return;
    setSending(target.id);
    try {
      await target.sender(uploadedUrls, user);
      toast.success("✅ Imagen enviada");
      navigate(target.url);
    } catch (e) {
      console.error("Error enviando al chat:", e);
      toast.error("No se pudo enviar al chat");
      setSending(null);
    }
  };

  const iconFor = (type) => {
    if (type === "coordinator") return MessageCircle;
    if (type === "admin") return Shield;
    return Users;
  };

  return (
    <div className="space-y-4">
      {targets.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar chat..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No se encontraron chats.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((target) => {
            const Icon = target.icon || iconFor(target.type);
            const isSending = sending === target.id;
            return (
              <Card
                key={target.id}
                onClick={() => handlePick(target)}
                className={`cursor-pointer hover:shadow-md transition-all border-l-4 active:scale-[0.98] ${isSending ? 'opacity-60 pointer-events-none' : ''}`}
                style={{ borderLeftColor: target.color || "#3b82f6" }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: target.color || "#3b82f6" }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{target.title}</p>
                    {target.subtitle && (
                      <p className="text-xs text-slate-500 truncate">{target.subtitle}</p>
                    )}
                  </div>
                  {isSending ? (
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}