import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, MessageCircle, CheckCircle2 } from "lucide-react";
import { playerInCategory } from "../utils/playerCategoryFilter";

// Panel de lectura (Estrategia C). Solo se muestra a admin en anuncios con
// requiere_confirmacion = true. Calcula el % de familias que han confirmado y
// lista los pendientes con botón de recordatorio por WhatsApp.
export default function ReadConfirmationPanel({ announcement }) {
  const [open, setOpen] = useState(false);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["readPanelPlayers"],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
    enabled: open,
  });

  // Construir el universo de familias destinatarias (por email)
  const targeted = Array.isArray(announcement.destinatarios_emails) ? announcement.destinatarios_emails : [];

  const familiesMap = {};
  const scope = targeted.length > 0
    ? players.filter((p) => targeted.includes(p.email_padre) || targeted.includes(p.email_tutor_2) || targeted.includes(p.email_jugador))
    : (announcement.destinatarios_tipo === "Todos"
      ? players
      : players.filter((p) => playerInCategory(p, announcement.destinatarios_tipo)));

  scope.forEach((p) => {
    const email = p.email_padre || p.email_jugador;
    if (!email) return;
    if (!familiesMap[email]) {
      familiesMap[email] = {
        email,
        telefono: p.telefono || "",
        nombre: p.nombre_tutor_legal || p.nombre || "Familia",
        categoria: p.categoria_principal || p.deporte || "",
      };
    }
  });
  const families = Object.values(familiesMap);

  const confirmedEmails = new Set((announcement.confirmado_por || []).map((c) => c.email));
  const confirmedCount = families.filter((f) => confirmedEmails.has(f.email)).length;
  const total = families.length;
  const pct = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;
  const pendientes = families.filter((f) => !confirmedEmails.has(f.email));

  const whatsappLink = (f) => {
    const msg = `Hola ${f.nombre}, te recordamos leer y confirmar el anuncio importante del club en la app: "${announcement.titulo}". Gracias.`;
    const tel = (f.telefono || "").replace(/[^0-9]/g, "");
    const prefixed = tel.startsWith("34") ? tel : `34${tel}`;
    return `https://wa.me/${prefixed}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="mt-2 pt-2 border-t border-slate-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
      >
        <CheckCircle2 className="w-3 h-3" />
        Confirmaciones de lectura
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Calculando...
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>{pct}% leído</span>
                  <span>{confirmedCount} de {total} familias</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {pendientes.length === 0 ? (
                <p className="text-xs text-green-700 font-medium">✅ Todas las familias han confirmado.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">❌ Pendientes ({pendientes.length}):</p>
                  <div className="max-h-48 overflow-auto space-y-1">
                    {pendientes.map((f) => (
                      <div key={f.email} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{f.nombre}</p>
                          <p className="text-[10px] text-slate-400 truncate">{f.categoria || f.email}</p>
                        </div>
                        {f.telefono && (
                          <a href={whatsappLink(f)} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-[10px] text-green-700 border-green-300">
                              <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}