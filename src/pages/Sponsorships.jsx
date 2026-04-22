import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, FileText } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import SponsorForm from "../components/sponsors/SponsorForm";
import SponsorCard from "../components/sponsors/SponsorCard";
import SponsorDashboard from "../components/sponsors/SponsorDashboard";
import SponsorInterestPanel from "../components/sponsors/SponsorInterestPanel";

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
    if (editingSponsor) {
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

  const filteredSponsors = sponsors.filter(s => {
    const matchesSearch = s.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contacto_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
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
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            💰 Gestión de Patrocinios
          </h1>
          <p className="text-slate-600 mt-1">Administra los patrocinadores del club</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/ReciboGenerator">
            <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
              <FileText className="w-4 h-4 mr-2" />
              Generar Recibo
            </Button>
          </Link>
          <Button
            onClick={() => {
              setEditingSponsor(null);
              setShowForm(!showForm);
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Patrocinador
          </Button>
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

      {/* Solicitudes de patrocinio en camiseta */}
      <SponsorInterestPanel />

      {/* Dashboard KPIs */}
      <SponsorDashboard sponsors={sponsors} />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar patrocinador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "Principal", "Oro", "Plata", "Bronce", "Colaborador"].map(level => (
            <Button
              key={level}
              size="sm"
              variant={filterLevel === level ? "default" : "outline"}
              onClick={() => setFilterLevel(level)}
              className={filterLevel === level ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {level === "all" ? "Todos" : level}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {["all", "Activo", "Inactivo"].map(status => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className={filterStatus === status ? "bg-slate-700 hover:bg-slate-800" : ""}
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