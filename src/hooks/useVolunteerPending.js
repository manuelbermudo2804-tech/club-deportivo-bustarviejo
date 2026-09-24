import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const SEEN_KEY = "vol_seen_ids";

export const readIds = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
};
export const writeIds = (key, ids) => {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
};

// Oportunidades de voluntariado abiertas a las que el usuario aún no se ha apuntado.
// Devuelve también cuántas son "nuevas" (no vistas desde la última visita a Voluntariado).
export default function useVolunteerPending(user, pathname) {
  const email = user?.email;
  const { data: pending = [] } = useQuery({
    queryKey: ["volunteerPending", email],
    enabled: !!email,
    staleTime: 30000,
    refetchOnMount: "always",
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [opps, signups] = await Promise.all([
        base44.entities.VolunteerOpportunity.filter({ estado: "abierta" }, "-created_date", 30),
        base44.entities.VolunteerSignup.filter({ email }),
      ]);
      const mine = new Set(signups.map((s) => s.opportunity_id));
      return opps.filter((o) =>
        o.publicada !== false &&
        (!o.fecha || o.fecha >= today) &&
        o.creado_por !== email &&
        !mine.has(o.id)
      );
    },
  });

  const [seen, setSeen] = useState(() => readIds(SEEN_KEY));

  // Al entrar en Voluntariado, se marcan todas como vistas (se quita el globito)
  useEffect(() => {
    if (!(pathname || "").toLowerCase().includes("voluntariado") || pending.length === 0) return;
    const ids = [...new Set([...seen, ...pending.map((o) => o.id)])];
    if (ids.length !== seen.length) { writeIds(SEEN_KEY, ids); setSeen(ids); }
  }, [pathname, pending]);

  const newCount = pending.filter((o) => !seen.includes(o.id)).length;
  return { pending, newCount };
}