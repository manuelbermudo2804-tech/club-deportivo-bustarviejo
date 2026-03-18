import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Cake, Loader2, Check } from "lucide-react";

/**
 * Reemplaza la automatización "Felicitaciones de cumpleaños diarias".
 * Cuando un admin abre la app, comprueba si hay cumpleaños hoy.
 * Si los hay, muestra un botón para enviar las felicitaciones manualmente.
 * Los emails se envían vía la función backend sendBirthdayWishes (que usa Resend directamente).
 * 0 créditos de automatización.
 */
export default function FrontendBirthdayChecker() {
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [alreadySent, setAlreadySent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const check = async () => {
      try {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");

        // Comprobar si ya se enviaron hoy
        const todayStr = today.toISOString().split("T")[0];
        const logs = await base44.entities.BirthdayLog.filter({
          fecha: todayStr,
        });
        if (logs.length > 0) {
          setAlreadySent(true);
          return;
        }

        // Buscar jugadores con cumpleaños hoy
        const players = await base44.entities.Player.filter({ activo: true });
        let count = 0;
        for (const p of players) {
          if (!p.fecha_nacimiento) continue;
          const fn = p.fecha_nacimiento;
          if (fn.slice(5, 10) === `${mm}-${dd}`) count++;
        }

        // Buscar socios con cumpleaños hoy
        const members = await base44.entities.ClubMember.filter({ activo: true });
        for (const m of members) {
          if (!m.fecha_nacimiento) continue;
          if (m.fecha_nacimiento.slice(5, 10) === `${mm}-${dd}`) count++;
        }

        setBirthdayCount(count);
      } catch (err) {
        console.error("[BirthdayChecker]", err);
      }
    };

    setTimeout(check, 6000);
  }, []);

  const handleSend = async () => {
    setSending(true);
    try {
      await base44.functions.invoke("sendBirthdayWishes", {});
      setSent(true);
    } catch (err) {
      console.error("[BirthdayChecker] Error enviando:", err);
    } finally {
      setSending(false);
    }
  };

  if (alreadySent || birthdayCount === 0 || sent) return null;

  return (
    <div className="bg-gradient-to-r from-pink-500/10 to-yellow-500/10 border border-pink-300 rounded-2xl p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Cake className="w-5 h-5 text-pink-500" />
        <span className="text-sm font-medium text-slate-800">
          🎂 ¡{birthdayCount} cumpleaños hoy!
        </span>
      </div>
      <Button
        size="sm"
        onClick={handleSend}
        disabled={sending}
        className="bg-pink-500 hover:bg-pink-600 text-white text-xs"
      >
        {sending ? (
          <Loader2 className="w-3 h-3 animate-spin mr-1" />
        ) : sent ? (
          <Check className="w-3 h-3 mr-1" />
        ) : (
          <Cake className="w-3 h-3 mr-1" />
        )}
        {sending ? "Enviando..." : "Enviar felicitaciones"}
      </Button>
    </div>
  );
}