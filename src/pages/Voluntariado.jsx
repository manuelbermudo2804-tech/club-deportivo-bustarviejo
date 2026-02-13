import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import VolunteerProfileForm from "@/components/volunteer/VolunteerProfileForm";
import OpportunityForm from "@/components/volunteer/OpportunityForm";
import OpportunityCard from "@/components/volunteer/OpportunityCard";
import VolunteerDirectory from "@/components/volunteer/VolunteerDirectory";
import MyVolunteersList from "@/components/volunteer/MyVolunteersList";
import VolunteerSignupDialog from "@/components/volunteer/VolunteerSignupDialog";

export default function Voluntariado() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [openProfile, setOpenProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null); // null = nuevo, object = editar
  const [openOpp, setOpenOpp] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [signupOpp, setSignupOpp] = useState(null); // oportunidad para apuntarse

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // Todos los perfiles registrados por este usuario
  const { data: myRegisteredProfiles = [] } = useQuery({
    queryKey: ["volunteer_my_registered", user?.email],
    enabled: !!user,
    queryFn: async () => {
      // Buscar perfiles que registré yo O donde mi email es el del voluntario
      const byRegistrar = await base44.entities.VolunteerProfile.filter({ registrado_por_email: user.email });
      const byEmail = await base44.entities.VolunteerProfile.filter({ email: user.email });
      const map = new Map();
      [...byRegistrar, ...byEmail].forEach(p => map.set(p.id, p));
      return Array.from(map.values());
    }
  });

  // Mi perfil propio (para auto-rellenar al apuntarse)
  const myOwnProfile = myRegisteredProfiles.find(p => p.email === user?.email) || null;

  // Todos los perfiles (para directorio admin/coordinador)
  const canManage = !!(user?.role === 'admin' || user?.es_coordinador || user?.puede_gestionar_voluntarios);
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["volunteer_profiles_all"],
    enabled: canManage,
    queryFn: () => base44.entities.VolunteerProfile.list("-created_date", 500)
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["volunteer_opps"],
    queryFn: () => base44.entities.VolunteerOpportunity.list("-created_date", 100)
  });

  const { data: signups = [] } = useQuery({
    queryKey: ["volunteer_signups"],
    queryFn: () => base44.entities.VolunteerSignup.list("-created_date", 500)
  });

  // CRUD perfil
  const saveProfile = useMutation({
    mutationFn: async (payload) => {
      const clean = {
        ...payload,
        registrado_por_email: payload.registrado_por_email || user?.email,
        registrado_por_nombre: payload.registrado_por_nombre || user?.full_name || user?.email
      };
      if (editingProfile?.id) {
        return base44.entities.VolunteerProfile.update(editingProfile.id, clean);
      }
      return base44.entities.VolunteerProfile.create(clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_my_registered"] });
      qc.invalidateQueries({ queryKey: ["volunteer_profiles_all"] });
      setOpenProfile(false);
      setEditingProfile(null);
      setOpenSuccess(true);
    }
  });

  const deleteProfile = useMutation({
    mutationFn: (id) => base44.entities.VolunteerProfile.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_my_registered"] });
      qc.invalidateQueries({ queryKey: ["volunteer_profiles_all"] });
      toast.success("Voluntario eliminado");
    }
  });

  // CRUD oportunidades
  const createOpp = useMutation({
    mutationFn: async (payload) => {
      if (editingOpp) return base44.entities.VolunteerOpportunity.update(editingOpp.id, payload);
      return base44.entities.VolunteerOpportunity.create({ ...payload, creado_por: user.email });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_opps"] });
      setOpenOpp(false);
      setEditingOpp(null);
    }
  });

  const deleteOpp = useMutation({
    mutationFn: (id) => base44.entities.VolunteerOpportunity.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteer_opps"] })
  });

  // Apuntarse a oportunidad
  const doSignup = useMutation({
    mutationFn: async ({ opp, nombre, telefono, por_quien, mensaje }) => {
      await base44.entities.VolunteerSignup.create({
        opportunity_id: opp.id,
        volunteer_email: user.email,
        volunteer_nombre: nombre,
        volunteer_telefono: telefono,
        por_quien: por_quien || "yo",
        mensaje: mensaje || ""
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_signups"] });
      toast.success("¡Te has apuntado!");
    }
  });

  const isStaff = !!(user?.role === "admin" || user?.es_entrenador || user?.es_coordinador);

  const openNewProfile = () => {
    setEditingProfile(null);
    setOpenProfile(true);
  };

  const openEditProfile = (p) => {
    setEditingProfile(p);
    setOpenProfile(true);
  };

  const handleDeleteProfile = (p) => {
    if (window.confirm(`¿Eliminar a ${p.nombre} del voluntariado?`)) {
      deleteProfile.mutate(p.id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl lg:text-3xl font-bold">🤝 Voluntariado</h1>
        <div className="flex flex-wrap gap-2">
          {isStaff && (
            <Button size="sm" onClick={() => setOpenOpp(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" /> Nueva oportunidad
            </Button>
          )}
        </div>
      </div>

      {/* Mis voluntarios registrados (visible para todos) */}
      <MyVolunteersList
        profiles={myRegisteredProfiles}
        onAdd={openNewProfile}
        onEdit={openEditProfile}
        onDelete={handleDeleteProfile}
      />

      {/* Directorio completo (solo admin/coordinador/gestores) */}
      {canManage && (
        <VolunteerDirectory
          profiles={allProfiles}
          onEdit={openEditProfile}
          onDelete={handleDeleteProfile}
        />
      )}

      {/* Oportunidades de voluntariado */}
      <div>
        <h2 className="text-xl font-bold mb-3">📢 Oportunidades</h2>
        {opportunities.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-white rounded-xl border">
            No hay oportunidades de voluntariado publicadas en este momento.
          </div>
        )}
        <div className="grid gap-3">
          {opportunities.map((opp) => {
            const oppSignups = signups.filter(s => s.opportunity_id === opp.id);
            const count = oppSignups.length;
            const alreadySignedUp = oppSignups.some(s => s.volunteer_email === user?.email);
            const isCreator = opp.creado_por === user?.email;
            return (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                count={count}
                alreadySignedUp={alreadySignedUp}
                isCreator={isCreator}
                isStaff={isStaff}
                onSignup={() => setSignupOpp(opp)}
                onEdit={() => { setEditingOpp(opp); setOpenOpp(true); }}
                onDelete={() => {
                  if (window.confirm(`¿Eliminar "${opp.titulo}"?`)) deleteOpp.mutate(opp.id);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Dialog: Crear/Editar perfil voluntario */}
      <Dialog open={openProfile} onOpenChange={(v) => { setOpenProfile(v); if (!v) setEditingProfile(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar voluntario" : "Registrar voluntario"}</DialogTitle>
          </DialogHeader>
          <VolunteerProfileForm
            initial={editingProfile || { email: user?.email, nombre: user?.full_name || "" }}
            onSubmit={(payload) => saveProfile.mutate(payload)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Éxito */}
      <Dialog open={openSuccess} onOpenChange={setOpenSuccess}>
        <DialogContent className="sm:max-w-md text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold">¡Registrado!</h3>
          <p className="text-slate-600 text-sm">El voluntario se ha guardado correctamente. Puedes registrar más personas o apuntarte a oportunidades.</p>
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setOpenSuccess(false)}>Cerrar</Button>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear/Editar oportunidad */}
      <Dialog open={openOpp} onOpenChange={(v) => { setOpenOpp(v); if (!v) setEditingOpp(null); }}>
        <DialogContent className="sm:max-w-lg">
          <OpportunityForm initial={editingOpp} onSubmit={(payload) => createOpp.mutate(payload)} />
        </DialogContent>
      </Dialog>

      {/* Dialog: Apuntarse a oportunidad */}
      <VolunteerSignupDialog
        open={!!signupOpp}
        onOpenChange={(v) => { if (!v) setSignupOpp(null); }}
        opp={signupOpp}
        user={user}
        myProfile={myOwnProfile}
        onSubmit={(data) => doSignup.mutate(data)}
      />
    </div>
  );
}