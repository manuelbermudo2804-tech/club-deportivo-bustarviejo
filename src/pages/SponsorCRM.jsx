import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import CrmSummaryPanel from "../components/crm/CrmSummaryPanel";
import CrmPipeline from "../components/crm/CrmPipeline";
import CrmTasksPanel from "../components/crm/CrmTasksPanel";
import CrmSponsorDialog from "../components/crm/CrmSponsorDialog";
import CrmQuickAddDialog from "../components/crm/CrmQuickAddDialog";
import SponsorForm from "../components/sponsors/SponsorForm";
import { ETAPA_MAP } from "../components/crm/crmConfig";

export default function SponsorCRM() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ["sponsors"],
    queryFn: () => base44.entities.Sponsor.list("-created_date"),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sponsors"] });

  // Mantener el patrocinador seleccionado sincronizado tras refrescos
  const selectedLive = selected ? sponsors.find(s => s.id === selected.id) || selected : null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Sponsor.create(data),
    onSuccess: () => { refresh(); setShowQuickAdd(false); toast.success("✅ Prospecto añadido al pipeline"); },
    onError: () => toast.error("Error al crear el prospecto"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sponsor.update(id, data),
    onSuccess: () => { refresh(); },
    onError: () => toast.error("Error al actualizar"),
  });

  const handleMove = async (id, nuevaEtapa) => {
    const sponsor = sponsors.find(s => s.id === id);
    if (!sponsor) return;
    const entry = {
      fecha: new Date().toISOString(),
      tipo: "cambio_etapa",
      descripcion: `Movido a "${ETAPA_MAP[nuevaEtapa]?.label || nuevaEtapa}"`,
    };
    const data = {
      etapa_crm: nuevaEtapa,
      historial_crm: [...(sponsor.historial_crm || []), entry],
    };
    // Al ganar, activarlo para que aparezca en el banner; al perder, desactivarlo
    if (nuevaEtapa === "ganado") data.activo = true;
    if (nuevaEtapa === "perdido") data.activo = false;
    updateMutation.mutate({ id, data });
  };

  const handleChangeStage = (sponsor, etapa) => handleMove(sponsor.id, etapa);

  const handleLogInteraction = (sponsor, { tipo, descripcion, proxima_accion_fecha, proxima_accion_texto }) => {
    const entry = { fecha: new Date().toISOString(), tipo, descripcion };
    const data = {
      historial_crm: [...(sponsor.historial_crm || []), entry],
      fecha_ultimo_contacto: new Date().toISOString().slice(0, 10),
    };
    if (proxima_accion_fecha) data.proxima_accion_fecha = proxima_accion_fecha;
    if (proxima_accion_texto) data.proxima_accion_texto = proxima_accion_texto;
    updateMutation.mutate({ id: sponsor.id, data });
    toast.success("Interacción registrada");
  };

  const handleEditSubmit = (data) => {
    if (!editingSponsor) return;
    updateMutation.mutate(
      { id: editingSponsor.id, data },
      { onSuccess: () => { setEditingSponsor(null); toast.success("✅ Ficha actualizada"); } }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <Link to="/Sponsorships" className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Patrocinadores
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            🤝 CRM de Patrocinadores
          </h1>
          <p className="text-slate-600 mt-1">Pipeline comercial, seguimientos y renovaciones</p>
        </div>
        <Button onClick={() => setShowQuickAdd(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" /> Nueva empresa
        </Button>
      </div>

      <CrmSummaryPanel sponsors={sponsors} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 order-2 lg:order-1">
          <CrmTasksPanel sponsors={sponsors} onSelect={setSelected} />
        </div>
        <div className="lg:col-span-3 order-1 lg:order-2">
          <CrmPipeline sponsors={sponsors} onCardClick={setSelected} onMove={handleMove} />
        </div>
      </div>

      <CrmSponsorDialog
        sponsor={selectedLive}
        open={!!selectedLive}
        onClose={() => setSelected(null)}
        onLogInteraction={handleLogInteraction}
        onChangeStage={handleChangeStage}
        onEdit={(s) => { setSelected(null); setEditingSponsor(s); }}
      />

      <CrmQuickAddDialog
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onCreate={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />

      <AnimatePresence>
        {editingSponsor && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center overflow-y-auto p-4">
            <div className="w-full max-w-2xl mt-8">
              <SponsorForm
                sponsor={editingSponsor}
                players={players}
                onSubmit={handleEditSubmit}
                onCancel={() => setEditingSponsor(null)}
                isSubmitting={updateMutation.isPending}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}