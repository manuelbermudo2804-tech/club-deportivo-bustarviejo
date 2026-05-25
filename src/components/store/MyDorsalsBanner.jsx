import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Shirt, Info } from "lucide-react";

/**
 * Banner para la página de Tienda.
 * - Si la familia/jugador ya tiene dorsales asignados, los muestra para que sepan
 *   qué dorsal personalizar en la equipación.
 * - Si no, muestra un aviso de que el club les avisará cuando lo asigne.
 */
export default function MyDorsalsBanner() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const withRetry = async (fn, label) => {
      for (let i = 0; i < 4; i++) {
        try { return await fn(); }
        catch (e) {
          const is429 = e?.status === 429 || /rate limit/i.test(e?.message || "");
          if (!is429 || i === 3) throw e;
          console.log(`[MyDorsalsBanner] ${label}: rate limited, retry ${i + 1}/3`);
          await sleep(1500 * (i + 1));
        }
      }
    };

    (async () => {
      try {
        const user = await withRetry(() => base44.auth.me(), "auth.me");
        console.log("[MyDorsalsBanner] user:", user?.email);
        if (!user || cancelled) return;

        // Buscar jugadores por todos los emails posibles del usuario (padre, tutor2, jugador, menor)
        const email = user.email;
        const [byPadre, byTutor2, byJugador, byMenor] = await Promise.all([
          withRetry(() => base44.entities.Player.filter({ email_padre: email }), "Player.byPadre"),
          withRetry(() => base44.entities.Player.filter({ email_tutor_2: email }), "Player.byTutor2"),
          withRetry(() => base44.entities.Player.filter({ email_jugador: email }), "Player.byJugador"),
          withRetry(() => base44.entities.Player.filter({ acceso_menor_email: email }), "Player.byMenor"),
        ]);
        if (cancelled) return;
        const allPlayersMap = new Map();
        [...(byPadre||[]), ...(byTutor2||[]), ...(byJugador||[]), ...(byMenor||[])].forEach(p => allPlayersMap.set(p.id, p));
        const players = [...allPlayersMap.values()];
        console.log("[MyDorsalsBanner] players found:", players.length, players.map(p => ({ id: p.id, nombre: p.nombre })));

        const playerIds = players.map((p) => p.id);
        if (playerIds.length === 0) { setAssignments([]); return; }

        const all = await withRetry(() => base44.entities.DorsalAssignment.filter({ estado: "asignado" }), "DorsalAssignment.filter");
        if (cancelled) return;
        console.log("[MyDorsalsBanner] total assignments:", all?.length);

        const mine = (all || []).filter((a) => playerIds.includes(a.jugador_id));
        console.log("[MyDorsalsBanner] mine assignments:", mine.length, mine.map(a => ({ player: a.jugador_nombre, dorsal: a.dorsal, temp: a.temporada })));

        // Quedarnos con la temporada más reciente que tenga asignaciones para este usuario
        const temporadas = [...new Set(mine.map(a => a.temporada).filter(Boolean))].sort().reverse();
        const temporadaTarget = temporadas[0];
        console.log("[MyDorsalsBanner] temporada target:", temporadaTarget);

        const mineDeTemporada = mine.filter(a => a.temporada === temporadaTarget);

        // Un dorsal por jugador (el más reciente si hubiera duplicados en la misma temporada)
        mineDeTemporada.sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));
        const seen = new Set();
        const unique = [];
        for (const a of mineDeTemporada) {
          if (seen.has(a.jugador_id)) continue;
          seen.add(a.jugador_id);
          unique.push(a);
        }
        setAssignments(unique);
      } catch (e) {
        console.error("[MyDorsalsBanner] ERROR:", e);
        if (!cancelled) setAssignments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;

  // Caso 1: TIENE dorsales asignados
  if (assignments.length > 0) {
    return (
      <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-green-900 text-base">
                ✅ {assignments.length === 1 ? "Tu dorsal ya está asignado" : "Dorsales asignados"}
              </h3>
              <p className="text-sm text-green-800">
                Personaliza la equipación con <strong>este dorsal y nombre</strong>:
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {assignments.map((a, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 bg-white border-2 border-green-300 rounded-xl p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate">{a.jugador_nombre}</div>
                  <div className="text-xs text-slate-500 truncate">{a.categoria} · {a.temporada}</div>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className="text-[10px] uppercase font-semibold text-green-700">Dorsal</div>
                  <div className="text-3xl font-black text-green-700 leading-none">#{a.dorsal}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Importante:</strong> revisa bien el <strong>dorsal y el nombre</strong> al hacer el pedido. La equipación se fabrica personalizada y no admite cambios.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Caso 2: NO tiene dorsales asignados aún
  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Shirt className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 text-base mb-1">
              ⏳ Espera a saber tu dorsal antes de personalizar
            </h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              El club te avisará por <strong>email y WhatsApp</strong> en cuanto tengas tu dorsal asignado para la próxima temporada. Personaliza la equipación solo cuando recibas la notificación con el número.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}