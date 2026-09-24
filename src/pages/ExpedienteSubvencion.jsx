import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ShieldCheck } from "lucide-react";
import { currentSeason, seasonRange } from "@/components/subvencion/expedienteConfig";
import ExpedienteHeader from "@/components/subvencion/ExpedienteHeader";
import DocumentosTab from "@/components/subvencion/DocumentosTab";
import DeportistasTab from "@/components/subvencion/DeportistasTab";
import GastosTab from "@/components/subvencion/GastosTab";
import IngresosGastosTab from "@/components/subvencion/IngresosGastosTab";

const temporadasDisponibles = () => {
  const y = parseInt(currentSeason().split("-")[0], 10);
  return [y + 1, y, y - 1].map((a) => `${a}-${a + 1}`);
};

export default function ExpedienteSubvencion() {
  const [allowed, setAllowed] = useState(null);
  const [temporada, setTemporada] = useState(currentSeason());
  const [exp, setExp] = useState(null);
  const [tab, setTab] = useState("documentos");

  useEffect(() => {
    base44.auth.me().then((u) => setAllowed(u?.role === "admin" || !!u?.es_tesorero)).catch(() => setAllowed(false));
  }, []);

  const load = useCallback(async () => {
    setExp(null);
    const rows = await base44.entities.SubvencionExpediente.filter({ temporada }, "-created_date", 1);
    if (rows[0]) return setExp(rows[0]);
    const created = await base44.entities.SubvencionExpediente.create({
      temporada,
      entidad: "Ayuntamiento de Bustarviejo",
      importe_concedido: 6000,
      fecha_limite_justificacion: `${seasonRange(temporada).fin}-09-30`,
      documentos: [],
    });
    setExp(created);
  }, [temporada]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const updateExp = async (patch) => {
    setExp((prev) => ({ ...prev, ...patch }));
    await base44.entities.SubvencionExpediente.update(exp.id, patch);
  };

  if (allowed === false) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Esta sección es solo para la Junta (administración y tesorería).</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-5">
      <ExpedienteHeader exp={exp} temporada={temporada} temporadas={temporadasDisponibles()} onTemporada={setTemporada} updateExp={updateExp} />
      {!exp ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="gastos">Gastos</TabsTrigger>
            <TabsTrigger value="cuadro">Ingresos y gastos</TabsTrigger>
            <TabsTrigger value="deportistas">Deportistas</TabsTrigger>
          </TabsList>
          <TabsContent value="documentos" className="mt-4"><DocumentosTab exp={exp} updateExp={updateExp} onGoTab={setTab} /></TabsContent>
          <TabsContent value="gastos" className="mt-4"><GastosTab exp={exp} /></TabsContent>
          <TabsContent value="cuadro" className="mt-4"><IngresosGastosTab exp={exp} /></TabsContent>
          <TabsContent value="deportistas" className="mt-4"><DeportistasTab exp={exp} updateExp={updateExp} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}