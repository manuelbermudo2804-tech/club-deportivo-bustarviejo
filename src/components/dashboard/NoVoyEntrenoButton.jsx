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
  const key = ["noVoy", prefijo];

  const { data: ultimo } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await base44.entities.ChatMessage.filter(
        { grupo_id: grupoId, client_id: { $regex: `^${prefijo}` } },
        { sort: "-created_date", limit: 1 }
      );
      return r.items?.[0] || null;
    },
    staleTime: 60000,
  });
  const avisado = ultimo?.client_id?.startsWith(`${prefijo}no_`);

  const enviar = async (noVa) => {
    if (noVa && !window.confirm(`¿Seguro que ${jugador.nombre} no irá hoy a entrenar? Se avisa al entrenador y al chat del equipo.`)) return;
    setSending(true);
    const texto = noVa
      ? `🚫 ${jugador.nombre} no irá al entrenamiento de hoy.`
      : `✅ Al final ${jugador.nombre} sí irá al entrenamiento de hoy.`;
    await base44.entities.ChatMessage.create({
      tipo: "padre_a_grupo",
      remitente_email: user.email,
      remitente_nombre: user.full_name || jugador.nombre,
      mensaje: texto,
      grupo_id: grupoId,
      deporte: categoria,
      client_id: `${prefijo}${noVa ? "no" : "si"}_${Date.now()}`,
      leido_por: [{ email: user.email, nombre: user.full_name || "", fecha: new Date().toISOString() }],
    });
    await qc.invalidateQueries({ queryKey: key });
    setSending(false);
    toast.success(noVa ? "Avisado al entrenador y al equipo" : "Aviso anulado");
  };

  const nombre = jugador.nombre.split(" ")[0];
  if (avisado) {
    const quien = ultimo.remitente_email === user.email ? "" : ` (${(ultimo.remitente_nombre || "").split(" ")[0]})`;
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">{solo ? "No va" : `${nombre} no va`}{quien}</span>
        <button disabled={sending} onClick={() => enviar(false)} className="text-orange-600 font-semibold hover:underline disabled:opacity-50">
          Deshacer
        </button>
      </div>
    );
  }
  return (
    <button disabled={sending} onClick={() => enviar(true)}
      className="text-xs font-medium px-3 py-1 rounded-full border border-slate-300 text-slate-600 bg-white hover:border-orange-400 hover:text-orange-600 disabled:opacity-50 whitespace-nowrap">
      {sending ? "Avisando..." : solo ? "No voy" : `${nombre} no va`}
    </button>
  );
}