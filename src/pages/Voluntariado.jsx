import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, CheckCircle2 } from "lucide-react";
import VolunteerProfileForm from "@/components/volunteer/VolunteerProfileForm";
import OpportunityForm from "@/components/volunteer/OpportunityForm";
import OpportunityCard from "@/components/volunteer/OpportunityCard";
import VolunteerDirectory from "@/components/volunteer/VolunteerDirectory";

export default function Voluntariado() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [openProfile, setOpenProfile] = useState(false);
  const [openOpp, setOpenOpp] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [openSuccess, setOpenSuccess] = useState(false);

  useEffect(()=>{ base44.auth.me().then(setUser).catch(()=>{}); },[]);

  const { data: myProfile } = useQuery({ queryKey:["volunteer_profile"], enabled: !!user, queryFn: async()=>{
    const list = await base44.entities.VolunteerProfile.filter({ email: user.email });
    return list[0] || null;
  }});

  const { data: opportunities = [] } = useQuery({ queryKey:["volunteer_opps"], queryFn: ()=> base44.entities.VolunteerOpportunity.list("-created_date", 100) });
  const { data: signups = [] } = useQuery({ queryKey:["volunteer_signups"], queryFn: ()=> base44.entities.VolunteerSignup.list("-created_date", 200) });
  const { data: profiles = [] } = useQuery({ queryKey:["volunteer_profiles_all"], enabled: !!user && (user.role === 'admin' || user.es_coordinador), queryFn: ()=> base44.entities.VolunteerProfile.list("-created_date", 500) });

  const saveProfile = useMutation({ mutationFn: async (payload) => {
    if (myProfile) return base44.entities.VolunteerProfile.update(myProfile.id, payload);
    return base44.entities.VolunteerProfile.create(payload);
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["volunteer_profile"]}); setOpenProfile(false); setOpenSuccess(true); }});

  const createOpp = useMutation({ mutationFn: async (payload) => {
    if (editingOpp) {
      return base44.entities.VolunteerOpportunity.update(editingOpp.id, payload);
    }
    return base44.entities.VolunteerOpportunity.create({ ...payload, creado_por: user.email });
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["volunteer_opps"]}); setOpenOpp(false); setEditingOpp(null); }});

  const deleteOpp = useMutation({ mutationFn: async (id) => {
    return base44.entities.VolunteerOpportunity.delete(id);
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["volunteer_opps"]}); }});

  const doSignup = useMutation({ mutationFn: async ({ opp, por_quien, nombre, telefono, mensaje }) => {
    const name = nombre || myProfile?.nombre || user?.full_name || user?.email;
    const tel = (telefono || myProfile?.telefono || "").toString();
    await base44.entities.VolunteerSignup.create({ opportunity_id: opp.id, volunteer_email: user.email, volunteer_nombre: name, volunteer_telefono: tel, por_quien: por_quien || 'yo', mensaje: mensaje || '' });
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["volunteer_signups"]}); }});

  const isStaff = !!(user?.role === 'admin' || user?.es_entrenador || user?.es_coordinador);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-3xl font-bold w-full md:w-auto">Voluntariado</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button size="sm" variant="outline" onClick={()=>setOpenProfile(true)}>{myProfile?"Editar perfil":"Crear perfil"}</Button>
          {isStaff && <Button size="sm" onClick={()=>setOpenOpp(true)} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-1"/>Nueva oportunidad</Button>}
        </div>
      </div>

      {!myProfile && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4 text-green-800">
          💚 Crea tu perfil de voluntariado para que podamos contar contigo en eventos y tareas del club.
        </div>
      )}

      {(user?.role === 'admin' || user?.es_coordinador) && (
        <div className="mb-6">
          <VolunteerDirectory profiles={profiles||[]} />
        </div>
      )}

      <div className="grid gap-3">
        {opportunities.map((opp)=>{
          const oppSignups = signups.filter((s)=> s.opportunity_id === opp.id);
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
              onSignup={()=>{
                const nombre = prompt('¿A nombre de quién? (tú u otra persona)') || '';
                const telefono = prompt('Teléfono de contacto (opcional)') || '';
                const por_quien = nombre && (nombre !== (myProfile?.nombre || user?.full_name || user?.email)) ? 'familiar' : 'yo';
                doSignup.mutate({ opp, por_quien, nombre, telefono });
              }}
              onEdit={()=>{
                setEditingOpp(opp);
                setOpenOpp(true);
              }}
              onDelete={()=>{
                if (window.confirm(`¿Eliminar la oportunidad "${opp.titulo}"?`)) {
                  deleteOpp.mutate(opp.id);
                }
              }}
            />
          );
        })}
      </div>

      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="sm:max-w-lg">
          <VolunteerProfileForm initial={myProfile||{ email: user?.email }} onSubmit={(payload)=>{
              const clean = { ...payload, email: payload.email || user?.email };
              saveProfile.mutate(clean);
            }} />
        </DialogContent>
      </Dialog>

      {/* Éxito al guardar perfil */}
      <Dialog open={openSuccess} onOpenChange={setOpenSuccess}>
        <DialogContent className="sm:max-w-md text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold">¡Gracias!</h3>
          <p className="text-slate-600 text-sm">Tu perfil de voluntariado se ha guardado correctamente. Pronto contaremos contigo en actividades del club.</p>
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={()=> setOpenSuccess(false)}>Cerrar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={openOpp} onOpenChange={(v)=>{ setOpenOpp(v); if(!v) setEditingOpp(null); }}>
        <DialogContent className="sm:max-w-lg">
          <OpportunityForm 
            initial={editingOpp} 
            onSubmit={(payload)=>createOpp.mutate(payload)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}