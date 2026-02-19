import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function EmailNotificationTrigger({ user }) {
  const lastCallupIdRef = useRef(null);
  const lastPaymentUpdateRef = useRef({});

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    initialData: [],
    refetchInterval: 30000,
    enabled: !!user && (user.role === "admin" || user.es_entrenador || user.es_coordinador),
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-updated_date'),
    initialData: [],
    refetchInterval: 30000,
    enabled: !!user && (user.role === "admin" || user.es_tesorero),
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: !!user,
  });

  // Convocatorias: el envío de email se gestiona directamente desde CoachCallups.sendCallupNotifications()
  // NO duplicar aquí — simplemente actualizar el ref para evitar procesamiento innecesario
  useEffect(() => {
    if (!callups || callups.length === 0) return;
    lastCallupIdRef.current = callups[0]?.id;
  }, [callups]);

  // Pagos confirmados: el envío de email se gestiona desde PaymentApprovalNotifier
  // NO duplicar aquí

  return null;
}