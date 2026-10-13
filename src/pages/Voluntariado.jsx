import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import VolunteerProfileCard from "@/components/volunteer/VolunteerProfileCard";
import VolunteerProfileForm from "@/components/volunteer/VolunteerProfileForm";
import MyVolunteersList from "@/components/volunteer/MyVolunteersList";
import MySignupsHistory from "@/components/volunteer/MySignupsHistory";
import OpportunityForm from "@/components/volunteer/OpportunityForm";
import OpportunityCard from "@/components/volunteer/OpportunityCard";
import VolunteerDirectory from "@/components/volunteer/VolunteerDirectory";
import VolunteerSignupDialog from "@/components/volunteer/VolunteerSignupDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConectaTab from "@/components/conecta/ConectaTab";

export default function Voluntariado() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [openProfile, setOpenProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [openOpp, setOpenOpp] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [signupOpp, setSignupOpp] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // Deep link: si viene ?opp_id=xxx abre el diálogo de signup automáticamente
  const [pendingOppId, setPendingOppId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("opp_id") || null;
  });

  // Mi perfil propio de voluntario
  const { data: myProfile } = useQuery({
    queryKey: ["volunteer_profile", user?.email],
    enabled: !!user,
    queryFn: async () => {
      const list = await base44.entities.VolunteerProfile.filter({ email: user.email });
      return list[0] || null;
    }
  });

  // Voluntarios que yo he registrado (familiares, amigos, etc.)
  const { data: myRegisteredOthers = [] } = useQuery({
    queryKey: ["volunteer_my_others", user?.email],
    enabled: !!user,
    queryFn: async () => {
      const byMe = await base44.entities.VolunteerProfile.filter({ registrado_por_email: user.email });
      // Excluir mi propio perfil (se muestra aparte en la tarjeta)
      return byMe.filter(p => p.email !== user.email);
    }
  });

  // Directorio completo (admin/coordinador)
  const canManage = !!(user?.role === "admin" || user?.es_coordinador || user?.es_entrenador || user?.puede_gestionar_voluntarios);
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

  // Mis inscripciones a oportunidades
  const mySignups = signups.filter(s => s.email === user?.email);

  // CRUD perfil
  const saveProfile = useMutation({
    mutationFn: async (payload) => {
      const clean = {
        ...payload,
        registrado_por_email: payload.registrado_por_email || user?.email,
        registrado_por_nombre: payload.registrado_por_nombre || user?.full_name || user?.email
      };
      if (editingProfile?.id) return base44.entities.VolunteerProfile.update(editingProfile.id, clean);
      return base44.entities.VolunteerProfile.create(clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_profile"] });
      qc.invalidateQueries({ queryKey: ["volunteer_my_others"] });
      qc.invalidateQueries({ queryKey: ["volunteer_profiles_all"] });
      setOpenProfile(false);
      setEditingProfile(null);
      setOpenSuccess(true);
    }
  });

  const deleteProfile = useMutation({
    mutationFn: (id) => base44.entities.VolunteerProfile.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_profile"] });
      qc.invalidateQueries({ queryKey: ["volunteer_my_others"] });
      qc.invalidateQueries({ queryKey: ["volunteer_profiles_all"] });
      toast.success("Voluntario eliminado");
    }
  });

  // CRUD oportunidades (con detección de duplicados)
  const createOpp = useMutation({
    mutationFn: async (payload) => {
      if (editingOpp) return base44.entities.VolunteerOpportunity.update(editingOpp.id, payload);
      
      // Detectar duplicados: misma fecha + título similar
      if (payload.fecha) {
        const existing = opportunities.find(opp => 
          opp.fecha === payload.fecha && 
          opp.estado !== "cerrada" &&
          (opp.titulo?.toLowerCase().trim() === payload.titulo?.toLowerCase().trim() ||
           opp.categoria === payload.categoria)
        );
        if (existing) {
          throw new Error(`DUPLICADO:Ya existe una oportunidad similar para esa fecha: "${existing.titulo}" (creada por ${existing.creado_por_nombre || existing.creado_por}). Puedes verla abajo en la lista.`);
        }
      }
      
      return base44.entities.VolunteerOpportunity.create({ 
        ...payload, 
        creado_por: user.email,
        creado_por_nombre: user.full_name || user.email
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_opps"] });
      setOpenOpp(false);
      setEditingOpp(null);
      toast.success("Oportunidad creada correctamente");
    },
    onError: (error) => {
      if (error.message?.startsWith("DUPLICADO:")) {
        toast.error(error.message.replace("DUPLICADO:", ""), { duration: 6000 });
      } else {
        toast.error("Error al crear la oportunidad");
      }
    }
  });

  const deleteOpp = useMutation({
    mutationFn: (id) => base44.entities.VolunteerOpportunity.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteer_opps"] })
  });

  // Quitar a una persona apuntada (reabre la oportunidad si estaba completa)
  const removeSignup = useMutation({
    mutationFn: async (signup) => {
      await base44.entities.VolunteerSignup.delete(signup.id);
      const opp = opportunities.find(o => o.id === signup.opportunity_id);
      if (opp?.estado === "completa") {
        await base44.entities.VolunteerOpportunity.update(opp.id, { estado: "abierta" }).catch(() => {});
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_signups"] });
      qc.invalidateQueries({ queryKey: ["volunteer_opps"] });
      toast.success("Persona quitada de la lista");
    },
    onError: () => toast.error("No se ha podido quitar a esta persona")
  });

  // Signup con notificación al organizador
  const doSignup = useMutation({
    mutationFn: async ({ opp, nombre, telefono, por_quien, mensaje }) => {
      // Crear signup
      await base44.entities.VolunteerSignup.create({
        opportunity_id: opp.id,
        nombre: nombre,
        email: user.email,
        telefono: telefono || "",
        relacion: por_quien || "yo",
        mensaje: mensaje || ""
      });

      // Contar apuntados después de este
      const allSignupsForOpp = signups.filter(s => s.opportunity_id === opp.id);
      const newCount = allSignupsForOpp.length + 1;
      const plazas = opp.plazas || 0;

      // Si se cubren las plazas, marcar como completa
      if (plazas > 0 && newCount >= plazas) {
        // Solo el organizador/admin puede cambiar el estado; si no, no bloquea la inscripción
        await base44.entities.VolunteerOpportunity.update(opp.id, { estado: "completa" }).catch(() => {});
      }

      // Notificar al organizador
      if (opp.creado_por) {
        const msg = plazas > 0 && newCount >= plazas
          ? `🎉 ¡Plazas cubiertas! ${nombre} se ha apuntado a "${opp.titulo}" (${newCount}/${plazas}). ¡Ya tenéis el equipo completo!`
          : `✅ ${nombre} se ha apuntado a "${opp.titulo}" (${newCount}${plazas ? `/${plazas}` : ''} personas)`;
        
        try {
          // Buscar conversación existente con el organizador
          const SYSTEM_EMAIL = "sistema@cdbustarviejo.com";
          const SYSTEM_NAME = "Voluntariado CD Bustarviejo";
          const existingConvs = await base44.entities.PrivateConversation.filter({
            participante_familia_email: opp.creado_por,
            participante_staff_email: SYSTEM_EMAIL
          });
          let convId;
          if (existingConvs.length > 0) {
            convId = existingConvs[0].id;
            await base44.entities.PrivateConversation.update(convId, {
              ultimo_mensaje: msg.substring(0, 200),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: "staff"
            });
          } else {
            const newConv = await base44.entities.PrivateConversation.create({
              participante_familia_email: opp.creado_por,
              participante_familia_nombre: opp.creado_por_nombre || opp.creado_por,
              participante_staff_email: SYSTEM_EMAIL,
              participante_staff_nombre: SYSTEM_NAME,
              participante_staff_rol: "admin",
              categoria: "General",
              ultimo_mensaje: msg.substring(0, 200),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: "staff"
            });
            convId = newConv.id;
          }
          await base44.entities.PrivateMessage.create({
            conversacion_id: convId,
            remitente_email: SYSTEM_EMAIL,
            remitente_nombre: SYSTEM_NAME,
            remitente_tipo: "staff",
            mensaje: msg,
            leido: false
          });
        } catch (e) { console.error("Error notificando organizador:", e); }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volunteer_signups"] });
      qc.invalidateQueries({ queryKey: ["volunteer_opps"] });
      toast.success("🎉 ¡Te has apuntado! El organizador ha sido notificado.");
    },
    onError: () => {
      toast.error("No se ha podido completar la inscripción. Inténtalo de nuevo.");
    }
  });

  const isStaff = !!(user?.role === "admin" || user?.es_entrenador || user?.es_coordinador);

  // Deep link: cuando opportunities se cargan y hay un pendingOppId, abrir signup
  useEffect(() => {
    if (pendingOppId && opportunities.length > 0 && user) {
      const opp = opportunities.find(o => o.id === pendingOppId);
      if (!opp) {
        toast.error("Esta oportunidad ya no existe");
      } else if (opp.estado === "cerrada") {
        toast.error("Esta oportunidad está cerrada");
      } else if (opp.fecha && opp.fecha < new Date().toISOString().split("T")[0]) {
        toast.error("Este evento ya ha pasado");
      } else {
        const oppSignups = signups.filter(s => s.opportunity_id === opp.id);
        const alreadySignedUp = oppSignups.some(s => s.email === user?.email);
        const isFull = opp.plazas > 0 && oppSignups.length >= opp.plazas;
        if (alreadySignedUp) {
          toast.info("Ya estás apuntado a esta oportunidad ✅");
        } else if (isFull) {
          toast.info("Las plazas ya están cubiertas");
        } else {
          setSignupOpp(opp);
        }
      }
      setPendingOppId(null);
      // Limpiar URL sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete("opp_id");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
  }, [pendingOppId, opportunities, signups, user]);

  // Eliminar automáticamente oportunidades pasadas
  const today = new Date().toISOString().split("T")[0];
  useEffect(() => {
    if (!opportunities.length) return;
    const pastOpps = opportunities.filter(opp => opp.fecha && opp.fecha < today);
    if (pastOpps.length > 0) {
      Promise.all(pastOpps.map(opp => base44.entities.VolunteerOpportunity.delete(opp.id)))
        .then(() => qc.invalidateQueries({ queryKey: ["volunteer_opps"] }))
        .catch(e => console.error("Error eliminando oportunidades pasadas:", e));
    }
  }, [opportunities]);

  const activeOpportunities = opportunities.filter(opp => {
    if (!opp.fecha) return true;
    return opp.fecha >= today;
  });

  const openEditMyProfile = () => {
    setEditingProfile(myProfile || { email: user?.email, nombre: user?.full_name || "" });
    setOpenProfile(true);
  };

  const openNewOther = () => {
    setEditingProfile(null);
    setOpenProfile(true);
  };

  const openEditOther = (p) => {
    setEditingProfile(p);
    setOpenProfile(true);
  };

  const handleDeleteProfile = (p) => {
    if (window.confirm(`¿Eliminar a ${p.nombre} del voluntariado?`)) deleteProfile.mutate(p.id);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><Users className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
            <div className="min-w-0"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Participación del club</p><h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Voluntariado y Comunidad</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Voluntariado y conexión entre familias.</p></div>
          </div>
          {isStaff && <Button size="sm" onClick={() => setOpenOpp(true)} className="w-full shrink-0 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto"><Plus className="mr-2 h-4 w-4" />Nueva oportunidad</Button>}
        </div>
      </section>

      <Tabs defaultValue="voluntariado" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="voluntariado" className="min-w-0 rounded-xl px-2 py-2.5 text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white sm:text-sm">🤝 Voluntariado</TabsTrigger>
          <TabsTrigger value="conecta" className="min-w-0 rounded-xl px-2 py-2.5 text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white sm:text-sm">💚 Conecta con familias</TabsTrigger>
        </TabsList>

        <TabsContent value="conecta">
          <ConectaTab user={user} />
        </TabsContent>

        <TabsContent value="voluntariado" className="space-y-6">
      {/* 1. Mi perfil de voluntario */}
      <VolunteerProfileCard profile={myProfile} onEdit={openEditMyProfile} />

      {/* 2. Otros voluntarios que he registrado */}
      {myRegisteredOthers.length > 0 && (
        <MyVolunteersList
          profiles={myRegisteredOthers}
          onAdd={openNewOther}
          onEdit={openEditOther}
          onDelete={handleDeleteProfile}
        />
      )}

      {/* Botón para registrar más voluntarios (si ya tiene perfil) */}
      {myProfile && myRegisteredOthers.length === 0 && (
        <Button variant="outline" onClick={openNewOther} className="border-green-300 text-green-700 hover:bg-green-50">
          <UserPlus className="w-4 h-4 mr-2" /> Registrar a un familiar/amigo como voluntario
        </Button>
      )}
      {myProfile && myRegisteredOthers.length > 0 && (
        <Button variant="outline" size="sm" onClick={openNewOther} className="border-green-300 text-green-700 hover:bg-green-50">
          <UserPlus className="w-4 h-4 mr-2" /> Registrar otro voluntario
        </Button>
      )}

      {/* 3. Mis inscripciones */}
      <MySignupsHistory signups={mySignups} opportunities={opportunities} />

      {/* 4. Directorio completo (admin/coordinador) */}
      {canManage && (
        <VolunteerDirectory
          profiles={allProfiles}
          onEdit={openEditOther}
          onDelete={handleDeleteProfile}
          senderUser={user}
          existingOpportunities={opportunities}
        />
      )}

      {/* 5. Oportunidades activas (arriba las abiertas) */}
      <div>
        <h2 className="text-xl font-bold mb-3">📢 Oportunidades de voluntariado</h2>
        {activeOpportunities.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-white rounded-xl border">
            No hay oportunidades publicadas en este momento.
          </div>
        )}
        <div className="grid gap-3">
          {[...activeOpportunities]
            .sort((a, b) => {
              // Abiertas primero, luego completas, luego cerradas
              const order = { abierta: 0, completa: 1, cerrada: 2 };
              return (order[a.estado] || 0) - (order[b.estado] || 0);
            })
            .map((opp) => {
              const oppSignups = signups.filter(s => s.opportunity_id === opp.id);
              const alreadySignedUp = oppSignups.some(s => s.email === user?.email);
              const isFull = opp.plazas > 0 && oppSignups.length >= opp.plazas;
              return (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  signups={oppSignups}
                  alreadySignedUp={alreadySignedUp}
                  isCreator={opp.creado_por === user?.email}
                  isStaff={isStaff}
                  onSignup={(!isFull && opp.estado !== "cerrada") ? () => setSignupOpp(opp) : null}
                  onEdit={() => { setEditingOpp(opp); setOpenOpp(true); }}
                  onDelete={() => { if (window.confirm(`¿Eliminar "${opp.titulo}"?`)) deleteOpp.mutate(opp.id); }}
                  onRemoveSignup={(s) => { if (window.confirm(`¿Quitar a ${s.nombre} de "${opp.titulo}"?`)) removeSignup.mutate(s); }}
                  canRemoveAll={user?.role === "admin"}
                  currentEmail={user?.email}
                />
              );
            })}
        </div>
      </div>

        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={openProfile} onOpenChange={(v) => { setOpenProfile(v); if (!v) setEditingProfile(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProfile?.id ? "Editar voluntario" : (editingProfile?.email === user?.email ? "Mi perfil de voluntario" : "Registrar voluntario")}</DialogTitle>
          </DialogHeader>
          <VolunteerProfileForm
            initial={editingProfile || { email: user?.email, nombre: user?.full_name || "" }}
            onSubmit={(payload) => saveProfile.mutate(payload)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openSuccess} onOpenChange={setOpenSuccess}>
        <DialogContent className="sm:max-w-md text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold">¡Guardado!</h3>
          <p className="text-slate-600 text-sm">El perfil de voluntario se ha guardado correctamente.</p>
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setOpenSuccess(false)}>Cerrar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={openOpp} onOpenChange={(v) => { setOpenOpp(v); if (!v) setEditingOpp(null); }}>
        <DialogContent className="sm:max-w-lg">
          <OpportunityForm 
            initial={editingOpp} 
            onSubmit={(payload) => createOpp.mutate(payload)} 
            existingOpportunities={activeOpportunities}
            isSubmitting={createOpp.isPending}
          />
        </DialogContent>
      </Dialog>

      <VolunteerSignupDialog
        open={!!signupOpp}
        onOpenChange={(v) => { if (!v) setSignupOpp(null); }}
        opp={signupOpp}
        user={user}
        myProfile={myProfile}
        onSubmit={(data) => doSignup.mutate(data)}
      />
    </div>
  );
}