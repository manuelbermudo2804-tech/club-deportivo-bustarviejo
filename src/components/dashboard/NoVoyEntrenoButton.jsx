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
      const r = await base44.functions.invoke("noVoyEstado", { jugador_id: jugador.id, fecha: fechaISO, grupo_id: grupoId });
      return r.data?.ultimo || null;
    },
    staleTime: 60000,
  });
  const avisadoNo = ultimo?.client_id?.startsWith(`${prefijo}no_`);
  const avisadoSi = ultimo?.client_id?.startsWith(`${prefijo}si_`);

  const enviar = async (noVa) => {
    if (noVa && !window.confirm(`¿Seguro que ${jugador.nombre} no irá hoy a entrenar? Se avisa al entrenador y al chat del equipo.`)) return;
    setSending(true);
    const texto = noVa
      ? `🚫 ${jugador.nombre} no irá al entrenamiento de hoy.`
      : `✅ Al final ${jugador.nombre} sí irá al entrenamiento de hoy.`;
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
    setSending(false);
    toast.success(noVa ? "Avisado al entrenador y al equipo" : "Aviso anulado");
  };

  const nombre = jugador.nombre.split(" ")[0];
  const quien = ultimo?.remitente_email === user.email ? "" : ultimo?.remitente_nombre ? ` · ${ultimo.remitente_nombre.split(" ")[0]}` : "";
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <button disabled={sending || avisadoSi} onClick={() => enviar(false)}
        aria-pressed={!!avisadoSi}
        className={`px-3 py-1 rounded-full border font-semibold disabled:opacity-50 whitespace-nowrap ${avisadoSi ? "border-green-400 bg-green-100 text-green-800" : "border-green-300 bg-white text-green-700 hover:bg-green-50"}`}>
        {sending ? "Enviando..." : solo ? "✅ Voy" : `✅ ${nombre} va`}
      </button>
      <button disabled={sending || avisadoNo} onClick={() => enviar(true)}
        aria-pressed={!!avisadoNo}
        className={`px-3 py-1 rounded-full border font-semibold disabled:opacity-50 whitespace-nowrap ${avisadoNo ? "border-red-400 bg-red-100 text-red-800" : "border-slate-300 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600"}`}>
        {sending ? "Avisando..." : solo ? "🚫 No voy" : `🚫 ${nombre} no va`}
      </button>
      {(avisadoNo || avisadoSi) && <span className="text-[11px] text-slate-500">Avisado al equipo{quien}</span>}
    </div>
  );
}