import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cake } from "lucide-react";

const DIAS_ANTELACION = 15;

// Días que faltan hasta el próximo cumpleaños (0 = hoy)
const diasHasta = (fecha) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [, m, d] = fecha.substring(0, 10).split("-").map(Number);
  let prox = new Date(hoy.getFullYear(), m - 1, d);
  if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, m - 1, d);
  return Math.round((prox - hoy) / 86400000);
};

export default function StaffBirthdaysBanner() {
  const { data: proximos = [] } = useQuery({
    queryKey: ["staffBirthdays"],
    queryFn: async () => {
      const [users, players, socios] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Player.list("-created_date", 2000),
        base44.entities.ClubMember.list("-created_date", 2000),
      ]);
      const low = (e) => (e || "").toLowerCase();
      return users
        .filter((u) => u.es_entrenador || u.es_coordinador)
        .map((u) => {
          const e = low(u.email);
          const fecha =
            u.fecha_nacimiento ||
            players.find((p) => low(p.email_jugador) === e && p.fecha_nacimiento)?.fecha_nacimiento ||
            socios.find((s) => low(s.email) === e && s.fecha_nacimiento)?.fecha_nacimiento;
          if (!fecha) return null;
          return { nombre: u.full_name, rol: u.es_coordinador ? "Coordinador" : "Entrenador", fecha, dias: diasHasta(fecha) };
        })
        .filter((x) => x && x.dias <= DIAS_ANTELACION)
        .sort((a, b) => a.dias - b.dias);
    },
    staleTime: 3600000,
  });

  if (proximos.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-pink-600 to-purple-700 rounded-2xl p-4 shadow-xl">
      <p className="text-white font-bold text-sm flex items-center gap-2 mb-2">
        <Cake className="w-4 h-4" /> Próximos cumpleaños del cuerpo técnico
      </p>
      <div className="space-y-1.5">
        {proximos.map((p) => (
          <div key={p.nombre} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{p.nombre}</p>
              <p className="text-pink-100 text-xs">{p.rol} · {p.fecha.substring(8, 10)}/{p.fecha.substring(5, 7)}</p>
            </div>
            <span className="text-white text-xs font-bold whitespace-nowrap ml-2">
              {p.dias === 0 ? "¡Hoy! 🎉" : p.dias === 1 ? "Mañana" : `En ${p.dias} días`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}