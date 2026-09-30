import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import JuntaConfigForm from "@/components/junta/JuntaConfigForm";
import JuntaStats from "@/components/junta/JuntaStats";
import JuntaAsistentesTabla from "@/components/junta/JuntaAsistentesTabla";
import { unirRespuestas } from "@/lib/juntaUtils";

export default function JuntaSocios() {
  const qc = useQueryClient();
  const [juntaId, setJuntaId] = useState(null);
  const { data: juntas = [], isLoading } = useQuery({ queryKey: ["juntas"], queryFn: () => base44.entities.JuntaSocios.list("-fecha", 20), refetchOnMount: "always" });
  useEffect(() => { if (!juntaId && juntas.length) setJuntaId(juntas[0].id); }, [juntas, juntaId]);
  const junta = juntas.find((j) => j.id === juntaId) || null;

  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ["juntaRespuestas", junta?.id, junta?.landing_slug],
    enabled: !!junta,
    queryFn: async () => {
      const [app, web, socios] = await Promise.all([
        base44.entities.JuntaAsistencia.filter({ junta_id: junta.id }, "-updated_date", 1000),
        junta.landing_slug ? base44.entities.LandingSubmission.filter({ landing_slug: junta.landing_slug }, "-created_date", 1000) : [],
        base44.entities.ClubMember.list("-created_date", 2000),
      ]);
      return unirRespuestas(app, web, socios);
    },
  });

  const onSaved = (saved) => {
    setJuntaId(saved.id);
    qc.invalidateQueries({ queryKey: ["juntas"] });
    qc.invalidateQueries({ queryKey: ["juntaActiva"] });
    qc.invalidateQueries({ queryKey: ["juntaRespuestas"] });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>;

  return (
    <div className="p-4 lg:p-8 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">🗳️ Junta de Socios</h1>
        {juntas.length > 0 && (
          <select className="border rounded-lg px-3 py-2 text-sm" value={juntaId || ""} onChange={(e) => setJuntaId(e.target.value || null)}>
            {juntas.map((j) => <option key={j.id} value={j.id}>{j.titulo} · {j.fecha?.slice(0, 10)}</option>)}
            <option value="">+ Nueva junta</option>
          </select>
        )}
      </div>
      <JuntaConfigForm junta={junta} onSaved={onSaved} />
      {junta && (loadingRows ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" /> : (
        <>
          <JuntaStats rows={rows} />
          <p className="text-xs text-slate-500">Se juntan las respuestas de la app y las del formulario de la página pública. Socio = coincide por email o nombre con Gestión Socios.</p>
          <JuntaAsistentesTabla rows={rows} />
        </>
      ))}
    </div>
  );
}