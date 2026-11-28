import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, MessageCircle, CheckCircle2 } from "lucide-react";
import { playerInCategory } from "../utils/playerCategoryFilter";
import { getAnnouncementCategories } from "../utils/announcementRecipientFilter";

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

  // Construir el universo real de familias: categoría + destinatarios específicos.
  // Si una familia tiene dos tutores, basta con que uno confirme la lectura.
  const targetedRaw = announcement.destinatarios_emails;
  const targeted = [...new Set((Array.isArray(targetedRaw) ? targetedRaw : String(targetedRaw || "").split(","))
    .map((email) => String(email || "").trim().toLowerCase()).filter(Boolean))];
  const familiesMap = {};
  const confirmedEmails = new Set((announcement.confirmado_por || []).map((c) => String(c?.email || "").trim().toLowerCase()));
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const addFamily = (player, standaloneEmail = "") => {
    const emails = [...new Set([player?.email_padre, player?.email_tutor_2]
      .map(normalizeEmail).filter(Boolean))];
    if (standaloneEmail && !emails.includes(normalizeEmail(standaloneEmail))) emails.push(normalizeEmail(standaloneEmail));
    const key = emails[0] || normalizeEmail(standaloneEmail);
    if (!key) return;
    if (!familiesMap[key]) familiesMap[key] = {
      key, email: emails[0] || key, emails: [], telefono: player?.telefono || "",
      nombre: player?.nombre_tutor_legal || player?.nombre || key,
      categoria: player?.categoria_principal || player?.deporte || "",
    };
    familiesMap[key].emails = [...new Set([...familiesMap[key].emails, ...emails])];
    if (!familiesMap[key].telefono && player?.telefono) familiesMap[key].telefono = player.telefono;
  };

  let scopePlayers = [];
  if (announcement.destinatarios_modo === "individual") {
    targeted.forEach(email => {
      const player = players.find(p => [p.email_padre, p.email_tutor_2, p.email_jugador, p.acceso_menor_email]
        .some(value => normalizeEmail(value) === email));
      addFamily(player, email);
    });
  } else {
    const categories = getAnnouncementCategories(announcement);
    const categoryPlayers = categories.includes("Todos")
      ? players
      : players.filter(p => categories.some(category => playerInCategory(p, category)));
    const individuallySelectedPlayers = players.filter(p =>
      [p.email_padre, p.email_tutor_2, p.email_jugador, p.acceso_menor_email]
        .some(value => targeted.includes(normalizeEmail(value))));
    scopePlayers = [...new Map([...categoryPlayers, ...individuallySelectedPlayers].map(p => [p.id, p])).values()];
    scopePlayers.forEach(p => addFamily(p));
    targeted.forEach(email => {
      const linked = players.find(p => [p.email_padre, p.email_tutor_2, p.email_jugador, p.acceso_menor_email]
        .some(value => normalizeEmail(value) === email));
      addFamily(linked, email);
    });
  }

  const families = Object.values(familiesMap);
  const confirmedCount = families.filter(f => f.emails.some(email => confirmedEmails.has(email))).length;
  const total = families.length;
  const pct = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;
  const pendientes = families.filter(f => !f.emails.some(email => confirmedEmails.has(email)));
  const familiesWithoutEmail = announcement.destinatarios_modo === "individual"
    ? 0
    : scopePlayers.filter(p => !p.email_padre && !p.email_tutor_2 && ![p.email_jugador, p.acceso_menor_email].some(value => targeted.includes(normalizeEmail(value)))).length;

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

              {announcement.enviar_email && <div className="rounded-lg border bg-slate-50 p-2 text-xs text-slate-700"><b>Control del correo:</b> {announcement.email_enviados?.length || 0} de {announcement.email_total_destinatarios || 0} solicitudes de envío aceptadas por la aplicación. {announcement.email_fallidos?.length > 0 && <div className="mt-1 text-red-700"><b>Fallos ({announcement.email_fallidos.length}):</b> {announcement.email_fallidos.join(", ")}</div>}<p className="mt-1 text-[10px] text-slate-500">Esto confirma la aceptación del envío por el servicio, no que el mensaje haya llegado a la bandeja de entrada.</p></div>}
              {familiesWithoutEmail > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-800">{familiesWithoutEmail} ficha(s) de menores sin correo familiar asociado. Revisa esos datos: no podrán recibir recordatorios por email ni aparecer como familia confirmada por correo.</p>}
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
                          <Button asChild size="sm" variant="outline" className="h-7 text-[10px] text-green-700 border-green-300">
                            <a href={whatsappLink(f)} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                            </a>
                          </Button>
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