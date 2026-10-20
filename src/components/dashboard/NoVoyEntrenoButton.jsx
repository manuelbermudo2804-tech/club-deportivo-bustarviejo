import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { toGroupId } from "@/lib/chatGroupId";

// Botón "No voy" para el entreno de hoy de un jugador. El estado se guarda en el chat
// del equipo, así padre, madre y el propio jugador ven el mismo aviso.
export default function NoVoyEntrenoButton({ jugador, categoria, fechaISO, user, solo }) {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const grupoId = toGroupId(categoria);
  const prefijo = `novoy_${jugador.id}_${fechaISO}_`;
  // La clave debe incluir la actividad: un jugador puede tener botones separados para Aficionado y Sala.
  // Si solo usamos el prefijo jugador+fecha, React Query comparte el estado entre ambos botones.
  const key = ["noVoy", prefijo, grupoId];

  const { data: ultimo } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await base44.functions.invoke("noVoyEstado", { jugador_id: jugador.id, fecha: fechaISO, grupo_id: grupoId });
      return r.data?.ultimo || null;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
  const avisado = ultimo?.client_id?.startsWith(`${prefijo}no_`);

  const enviar = async (noVa) => {
    if (noVa && !window.confirm(`¿Seguro que ${jugador.nombre} no irá hoy a entrenar? Se avisa al entrenador y al chat del equipo.`)) return;
    setSending(true);
    const texto = noVa
      ? `🚫 ${jugador.nombre} no irá al entrenamiento de hoy (${categoria}).`
      : `✅ Al final ${jugador.nombre} sí irá al entrenamiento de hoy (${categoria}).`;
    try {
      const creado = await base44.entities.ChatMessage.create({
        tipo: "padre_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name || jugador.nombre,
        mensaje: texto,
        grupo_id: grupoId,
        deporte: categoria,
        client_id: `${prefijo}${noVa ? "no" : "si"}_${Date.now()}`,
        leido_por: [{ email: user.email, nombre: user.full_name || "", fecha: new Date().toISOString() }],
      });
      qc.setQueryData(key, creado);
      await qc.invalidateQueries({ queryKey: ["teamChatsHub"] });
      await qc.invalidateQueries({ queryKey: ["coachParentChatMessages", grupoId] });
      toast.success(noVa ? `Aviso enviado al chat de ${categoria}` : `Aviso actualizado en ${categoria}`);
    } catch (error) {
      console.error("[NoVoyEntrenoButton] No se pudo guardar el aviso", error);
      toast.error("No se ha podido enviar el aviso. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const nombre = jugador.nombre.split(" ")[0];
  if (avisado) {
    const quien = ultimo.remitente_email === user.email ? "" : ` (${(ultimo.remitente_nombre || "").split(" ")[0]})`;
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 font-semibold">
          🚫 Avisado en {categoria}: {solo ? "no vas" : `${nombre} no va`}{quien}
        </span>
        <button disabled={sending} onClick={() => enviar(false)}
          className="px-3 py-1 rounded-full border border-green-300 bg-green-50 text-green-700 font-semibold hover:bg-green-100 disabled:opacity-50 whitespace-nowrap">
          {sending ? "Enviando..." : solo ? "✅ Al final sí voy" : "✅ Al final sí va"}
        </button>
      </div>
    );
  }
  return (
    <button disabled={sending} onClick={() => enviar(true)}
      className="text-xs font-medium px-3 py-1 rounded-full border border-slate-300 text-slate-600 bg-white hover:border-orange-400 hover:text-orange-600 disabled:opacity-50 whitespace-nowrap">
      {sending ? "Avisando..." : `${categoria}: ${solo ? "No voy" : `${nombre} no va`}`}
    </button>
  );
}