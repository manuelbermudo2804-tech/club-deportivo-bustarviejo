import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, FileText, Receipt, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import SponsorForm from "../components/sponsors/SponsorForm";
import SponsorCard from "../components/sponsors/SponsorCard";
import SponsorDashboard from "../components/sponsors/SponsorDashboard";
import SponsorInterestPanel from "../components/sponsors/SponsorInterestPanel";
import PropuestasPatrocinioPanel from "../components/sponsors/PropuestasPatrocinioPanel";
import ColaboraLinkCard from "../components/sponsors/ColaboraLinkCard";
import CaptacionPanel from "@/components/sponsors/captacion/CaptacionPanel";

export default function Sponsorships() {
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const queryClient = useQueryClient();

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list('-created_date'),
  });



  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Sponsor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      setShowForm(false);
      toast.success("✅ Patrocinador creado correctamente");
    },
    onError: () => toast.error("Error al crear el patrocinador"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sponsor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      setShowForm(false);
      setEditingSponsor(null);
      toast.success("✅ Patrocinador actualizado");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Sponsor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success("Patrocinador eliminado");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const handleSubmit = (data) => {
    if (editingSponsor?.id) {
      updateMutation.mutate({ id: editingSponsor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (sponsor) => {
    setEditingSponsor(sponsor);
    setShowForm(true);
  };

  const handleDelete = (sponsor) => {
    if (confirm(`¿Eliminar el patrocinador "${sponsor.nombre}"?`)) {
      deleteMutation.mutate(sponsor.id);
    }
  };

  const handleToggleActive = (sponsor) => {
    const newStatus = !sponsor.activo;
    updateMutation.mutate({ 
      id: sponsor.id, 
      data: { activo: newStatus } 
    });
    toast.success(newStatus ? `✅ ${sponsor.nombre} activado - aparecerá en el banner` : `⏸️ ${sponsor.nombre} desactivado - no aparecerá en el banner`);
  };

  // Renovar patrocinio 1 año: desplaza fecha_fin (y opcionalmente fecha_inicio) un año
  const [renewingId, setRenewingId] = useState(null);
  const handleRenew = async (sponsor) => {
    const addYear = (dateStr) => {
      const d = dateStr ? new Date(dateStr) : new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    };
    setRenewingId(sponsor.id);
    try {
      await base44.entities.Sponsor.update(sponsor.id, {
        fecha_inicio: sponsor.fecha_fin || new Date().toISOString().split('T')[0],
        fecha_fin: addYear(sponsor.fecha_fin),
      });
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      toast.success(`✅ Patrocinio de ${sponsor.nombre} renovado 1 año`);
    } catch {
      toast.error("Error al renovar");
    } finally {
      setRenewingId(null);
    }
  };

  // Avisar al patrocinador por email de la renovación
  const [notifyingId, setNotifyingId] = useState(null);
  const handleNotifyRenewal = async (sponsor) => {
    setNotifyingId(sponsor.id);
    try {
      const res = await base44.functions.invoke('notifySponsorRenewal', { sponsorId: sponsor.id });
      if (res.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['sponsors'] });
        toast.success(`📧 Email de renovación enviado a ${sponsor.contacto_email}`);
      } else {
        toast.error(res.data?.error || "No se pudo enviar el email");
      }
    } catch {
      toast.error("Error al enviar el email");
    } finally {
      setNotifyingId(null);
    }
  };

  // Convertir una solicitud/propuesta aceptada en patrocinador (acción 3)
  const handleConvertToSponsor = (prefill) => {
    setEditingSponsor(prefill);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const filteredSponsors = sponsors.filter(s => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term ||
      s.nombre?.toLowerCase().includes(term) ||
      s.contacto_nombre?.toLowerCase().includes(term) ||
      s.contacto_email?.toLowerCase().includes(term);
    const matchesLevel = filterLevel === "all" || s.nivel_patrocinio === filterLevel;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "Activo" && s.activo === true) ||
      (filterStatus === "Inactivo" && s.activo === false);
    return matchesSearch && matchesLevel && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando patrocinadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6 space-y-5 sm:space-y-6 [&_*]:min-w-0 [&_input]:max-w-full [&_button]:max-w-full">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Administración del club</p>
          <h1 className="flex flex-wrap items-center gap-3 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><Building2 className="h-6 w-6 text-orange-400" /></span>
            Gestión de Patrocinios
          </h1>
          <p className="mt-2 text-sm text-slate-300">Administra los patrocinadores del club</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-2">
          <Link to="/PresupuestoGenerator" className="w-full">
            <Button variant="outline" className="w-full justify-center rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15">
              <ClipboardList className="w-4 h-4 mr-2" />
              Generar Presupuesto
            </Button>
          </Link>
          <Link to="/ReciboGenerator" className="w-full">
            <Button variant="outline" className="w-full justify-center rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15">
              <FileText className="w-4 h-4 mr-2" />
              Generar Recibo
            </Button>
          </Link>
          <Link to="/FacturaGenerator" className="w-full">
            <Button variant="outline" className="w-full justify-center rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15">
              <Receipt className="w-4 h-4 mr-2" />
              Generar Factura
            </Button>
          </Link>
          <Button
            onClick={() => {
              setEditingSponsor(null);
              setShowForm(!showForm);
            }}
            className="w-full justify-center rounded-xl bg-orange-600 font-semibold hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Patrocinador
          </Button>
        </div>
        </div>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {showForm && (
          <SponsorForm
            sponsor={editingSponsor}
            players={players}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingSponsor(null);
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      <CaptacionPanel sponsors={sponsors} />

      {/* Enlace de colaboración para compartir */}
      <ColaboraLinkCard />

      {/* Propuestas premium (GVC Gaesco y otras empresas) */}
      <PropuestasPatrocinioPanel onConvertToSponsor={handleConvertToSponsor} />

      {/* Solicitudes de patrocinio en camiseta */}
      <SponsorInterestPanel onConvertToSponsor={handleConvertToSponsor} />

      {/* Dashboard KPIs */}
      <SponsorDashboard
        sponsors={sponsors}
        onRenew={handleRenew}
        onNotifyRenewal={handleNotifyRenewal}
        renewingId={renewingId}
        notifyingId={notifyingId}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full min-w-0">
        <div className="relative w-full min-w-0 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar patrocinador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full min-w-0">
          {["all", "Principal", "Oro", "Plata", "Bronce", "Colaborador"].map(level => (
            <Button
              key={level}
              size="sm"
              variant={filterLevel === level ? "default" : "outline"}
              onClick={() => setFilterLevel(level)}
              className={`w-full justify-center ${filterLevel === level ? "bg-amber-600 hover:bg-amber-700" : ""}`}
            >
              {level === "all" ? "Todos" : level}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 w-full min-w-0">
          {["all", "Activo", "Inactivo"].map(status => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className={`w-full justify-center ${filterStatus === status ? "bg-slate-700 hover:bg-slate-800" : ""}`}
            >
              {status === "all" ? "Todos" : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de patrocinadores */}
      {filteredSponsors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No hay patrocinadores</p>
          <p className="text-sm text-slate-400 mt-1">Añade el primer patrocinador del club</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSponsors.map(sponsor => (
            <SponsorCard
              key={sponsor.id}
              sponsor={sponsor}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}