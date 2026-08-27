import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Datos del panel unificado: sus hijos, sus equipos (convocatorias que ella crea),
// horarios y pagos de su familia. Una sola carga para toda la pantalla.
export default function usePanelData(user) {
  const email = user?.email;
  const enabled = !!email;

  const { data: myPlayers = [] } = useQuery({
    queryKey: ["panelMyPlayers", email],
    queryFn: async () => {
      const all = await base44.entities.Player.filter({ activo: true }, "-updated_date", 500);
      return all.filter((p) => p.email_padre === email || p.email_tutor_2 === email);
    },
    initialData: [],
    staleTime: 300000,
    enabled,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["panelSchedules"],
    queryFn: () => base44.entities.TrainingSchedule.filter({ activo: true }),
    initialData: [],
    staleTime: 600000,
    enabled,
  });

  const { data: callups = [] } = useQuery({
    queryKey: ["panelCallups"],
    queryFn: () => base44.entities.Convocatoria.filter({ cerrada: false }, "-fecha_partido", 120),
    initialData: [],
    staleTime: 120000,
    enabled,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["panelPayments", email],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        base44.entities.Payment.filter({ email_padre: email }, "-created_date", 100),
        base44.entities.Payment.filter({ email_tutor_2: email }, "-created_date", 100),
      ]);
      const map = new Map();
      [...a, ...b].forEach((p) => { if (p.is_deleted !== true) map.set(p.id, p); });
      return Array.from(map.values());
    },
    initialData: [],
    staleTime: 300000,
    enabled,
  });

  return { myPlayers, schedules, callups, payments };
}