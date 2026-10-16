import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useReconocimientos from "@/hooks/useReconocimientos";
import useSinEntrenamiento from "@/hooks/useSinEntrenamiento";
import { buildWeekAgenda } from "@/components/dashboard/miSemanaHelper";

// Avisos de familia que el panel de entrenador-padre necesita igual que el panel de familias:
// documentos por firmar, encuestas, reconocimientos médicos y agenda de la semana.
export default function useFamilyAlertExtras(user, myPlayers, callups) {
  const enabled = !!user && myPlayers.length > 0;
  const sports = useMemo(() => [...new Set(myPlayers.map(p => p.deporte))], [myPlayers]);
  const cats = useMemo(() => [...new Set(myPlayers.flatMap(p => [p.categoria_principal || p.deporte, ...(p.categorias || [])]).filter(Boolean))], [myPlayers]);

  const { data: surveys = [] } = useQuery({
    queryKey: ['activeSurveys'],
    queryFn: () => base44.entities.Survey.filter({ activa: true }, '-created_date', 10),
    staleTime: 600000, refetchOnWindowFocus: false, enabled,
  });
  const { data: responses = [] } = useQuery({
    queryKey: ['mySurveyResponses', user?.email, surveys.map(s => s.id).join(',')],
    queryFn: async () => Promise.all(surveys.map(async (survey) => {
      const result = await base44.functions.invoke("surveyResponseSecure", {
        action: "has_responded",
        survey_id: survey.id
      });
      const status = result?.data || result || {};
      return status.hasResponded ? { survey_id: survey.id } : null;
    })).then(items => items.filter(Boolean)),
    staleTime: 600000, refetchOnWindowFocus: false, enabled: enabled && surveys.length > 0,
  });
  const { data: documents = [] } = useQuery({
    queryKey: ['pendingDocuments'],
    queryFn: () => base44.entities.Document.filter({ publicado: true, requiere_firma: true }, '-created_date', 20),
    staleTime: 600000, refetchOnWindowFocus: false, enabled,
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ['myTrainingSchedules', cats.join(',')],
    queryFn: () => base44.entities.TrainingSchedule.filter({ categoria: { $in: cats }, activo: true }),
    staleTime: 600000, refetchOnWindowFocus: false, enabled: enabled && cats.length > 0,
  });
  const { byJugador: rm } = useReconocimientos(enabled);
  const diasSinEntreno = useSinEntrenamiento();

  const pendingSurveys = surveys.filter(s =>
    s.activa && new Date(s.fecha_fin) >= new Date() &&
    !responses.some(r => r.survey_id === s.id) &&
    (s.destinatarios === "Todos" || sports.includes(s.destinatarios))
  ).length;

  const pendingDocuments = documents.filter(d => myPlayers.some(player => {
    const relevant = d.tipo_destinatario === "individual"
      ? d.jugadores_destino?.includes(player.id)
      : (d.categoria_destino === "Todos" || player.deporte === d.categoria_destino);
    const firma = relevant && d.firmas?.find(f => f.jugador_id === player.id);
    return firma && !firma.firmado && !firma.confirmado_firma_externa;
  })).length;

  const unseen = (uri) => uri && !localStorage.getItem(`rm_cita_vista_${uri}`);
  const pendingCitasRM = myPlayers.filter(p => [rm?.[p.id]?.cita_pdf_uri, rm?.[p.id]?.hora_cita_pdf_uri].some(unseen)).length;
  const rmNuevos = myPlayers.flatMap(p => {
    const r = rm?.[p.id]; const n = p.nombre?.split(" ")[0]; const out = [];
    if (unseen(r?.cita_pdf_uri)) out.push(`hoja de reconocimiento de ${n}`);
    if (unseen(r?.hora_cita_pdf_uri)) out.push(`hora de la cita de ${n}`);
    return out;
  });
  const rmVencen = myPlayers.map(p => {
    const f = rm?.[p.id]?.fecha_vencimiento;
    return f ? { nombre: p.nombre?.split(" ")[0], dias: Math.ceil((new Date(f) - new Date()) / 86400000) } : null;
  }).filter(x => x && x.dias <= 30);

  const weekAgenda = useMemo(
    () => buildWeekAgenda(myPlayers, schedules, callups, diasSinEntreno),
    [myPlayers, schedules, callups, diasSinEntreno]
  );

  return { pendingSurveys, pendingDocuments, pendingCitasRM, rmNuevos, rmVencen, weekAgenda };
}