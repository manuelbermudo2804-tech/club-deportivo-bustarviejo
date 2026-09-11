import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserX, Undo2 } from "lucide-react";
import { getNextTraining, labelEntreno } from "@/lib/nextTraining";
import useSinEntrenamiento from "@/hooks/useSinEntrenamiento";

// Solo Infantil y superiores pueden avisar por su cuenta
const CATEGORIAS_PERMITIDAS = ["Infantil", "Cadete", "Juvenil", "Aficionado", "Femenino"];

const toGroupId = (s) =>
  (s || "")
    .replace(/\(.*?\)/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().replace(/\s+/g, " ").toLowerCase().replace(/\s+/g, "_");

export default function MinorSkipTraining({ player, playerCategory, user }) {
  const [enviado, setEnviado] = useState(false);
  const [sending, setSending] = useState(false);

  // Solo para jugadores con acceso juvenil concedido y no revocado
  const tieneAccesoJuvenil = !!player?.acceso_menor_autorizado && !player?.acceso_menor_revocado;
  const permitida = tieneAccesoJuvenil && CATEGORIAS_PERMITIDAS.some((c) => (playerCategory || "").includes(c));

  const { data: schedules = [] } = useQuery({
    queryKey: ["minorSchedules", playerCategory],
    queryFn: () => base44.entities.TrainingSchedule.filter({ categoria: playerCategory, activo: true }),
    enabled: !!playerCategory && permitida,
    staleTime: 600000,
  });

  const diasSinEntreno = useSinEntrenamiento();
  const next = schedules.length ? getNextTraining(schedules, new Date(), diasSinEntreno) : null;
  const storageKey = next && player?.id ? `noVoyEntreno_${player.id}_${next.fechaISO}` : null;

  useEffect(() => {
    if (!storageKey) return;
    setEnviado(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (!permitida || !next || !player?.id) return null;

  const cuando = labelEntreno(next);

  const publicar = async (texto) => {
    const grupoId = toGroupId(playerCategory);
    await base44.entities.ChatMessage.create({
      tipo: "padre_a_grupo",
      remitente_email: user.email,
      remitente_nombre: player.nombre,
      mensaje: texto,
      grupo_id: grupoId,
      deporte: playerCategory,
      leido_por: [{ email: user.email, nombre: player.nombre, fecha: new Date().toISOString() }],
    });

    try {
      const settings = await base44.entities.CoachSettings.list();
      const coaches = settings.filter((s) => s.categorias_entrena?.includes(playerCategory));
      for (const coach of coaches) {
        if (coach.entrenador_email) {
          await base44.entities.AppNotification.create({
            usuario_email: coach.entrenador_email,
            titulo: `🚫 ${playerCategory.replace("Fútbol ", "").replace(" (Mixto)", "")}: aviso de ausencia`,
            mensaje: texto,
            tipo: "importante",
            icono: "🚫",
            enlace: "CoachParentChat",
            vista: false,
          });
        }
      }
    } catch {}
  };

  const handleAvisar = async () => {
    setSending(true);
    try {
      await publicar(`🚫 ${player.nombre} no irá al entrenamiento de ${cuando}.`);
      localStorage.setItem(storageKey, "1");
      setEnviado(true);
      toast.success("Avisado al entrenador y al equipo");
    } catch {
      toast.error("No se pudo enviar el aviso");
    } finally {
      setSending(false);
    }
  };

  const handleDeshacer = async () => {
    setSending(true);
    try {
      await publicar(`✅ Al final ${player.nombre} sí irá al entrenamiento de ${cuando}.`);
      localStorage.removeItem(storageKey);
      setEnviado(false);
      toast.success("Aviso anulado");
    } catch {
      toast.error("No se pudo anular el aviso");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className={`border-none shadow-lg overflow-hidden ${enviado ? "bg-gradient-to-r from-amber-500 to-orange-600" : "bg-white"}`}>
      <CardContent className="p-4">
        {enviado ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🚫</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Has avisado que no vas {cuando}</p>
              <p className="text-white/80 text-xs">Tu entrenador y el equipo ya lo saben</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleDeshacer} disabled={sending} className="flex-shrink-0">
              <Undo2 className="w-4 h-4 mr-1" /> Sí voy
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <UserX className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">¿No puedes ir a entrenar {cuando}?</p>
              <p className="text-slate-500 text-xs">Avisa a tu entrenador y al equipo con un toque</p>
            </div>
            <Button size="sm" onClick={handleAvisar} disabled={sending} className="bg-orange-600 hover:bg-orange-700 flex-shrink-0">
              No voy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}