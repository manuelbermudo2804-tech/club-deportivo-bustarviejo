import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import VolunteerProfileForm from "@/components/volunteer/VolunteerProfileForm";
import OpportunityForm from "@/components/volunteer/OpportunityForm";
import OpportunityCard from "@/components/volunteer/OpportunityCard";

export default function Voluntariado() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [openProfile, setOpenProfile] = useState(false);
  const [openOpp, setOpenOpp] = useState(false);

  useEffect(()=>{ base44.auth.me().then(setUser).catch(()=>{}); },[]);

  const { data: myProfile } = useQuery({ queryKey:["volunteer_profile"], enabled: !!user, queryFn: async()=>{
    const list = await base44.entities.VolunteerProfile.filter({ user_email: user.email });
    return list[0] || null;
  }});

  const { data: opportunities = [] } = useQuery({ queryKey:["volunteer_opps"], queryFn: ()=> base44.entities.VolunteerOpportunity.list("-created_date", 100) });
  const { data: signups = [] } = useQuery({ queryKey:["volunteer_signups"], queryFn: ()=> base44.entities.VolunteerSignup.list("-created_date", 200) });
  const { data: profiles = [] } = useQuery({ queryKey:["volunteer_profiles_all"], enabled: !!user && (user.role === 'admin' || user.es_entrenador || user.es_coordinador), queryFn: ()=> base44.entities.VolunteerProfile.list("-created_date", 500) });

  const saveProfile = useMutation({ mutationFn: async (payload) => {
    if (myProfile) return base44.entities.VolunteerProfile.update(myProfile.id, payload);
    return base44.entities.VolunteerProfile.create(payload);
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["volunteer_profile"]}); setOpenProfile(false); }});

  const createOpp = useMutation({ mutationFn: async (payload) => {
    return base44.entities.VolunteerOpportunity.create({ ...payload, creado_por: user.email });
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["volunteer_opps"]}); setOpenOpp(false); }});

  const doSignup = useMutation({ mutationFn: async ({ opp, por_quien, nombre, telefono, mensaje }) => {
    const name = nombre || myProfile?.nombre || user?.full_name || user?.email;
    const tel = (telefono || myProfile?.telefono || "").toString();
    await base44.entities.VolunteerSignup.create({ opportunity_id: opp.id, volunteer_email: user.email, volunteer_nombre: name, volunteer_telefono: tel, por_quien: por_quien || 'yo', mensaje: mensaje || '' });
  }, onSuccess:()=>{ qc.invalidateQueries({queryKey:["volunteer_signups"]}); }});

  const isStaff = !!(user?.role === 'admin' || user?.es_entrenador || user?.es_coordinador);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Voluntariado</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>setOpenProfile(true)}>{myProfile?"Editar perfil":"Crear perfil"}</Button>
          {isStaff && <Button onClick={()=>setOpenOpp(true)} className="bg-green-600"><Plus className="w-4 h-4 mr-1"/>Nueva oportunidad</Button>}
        </div>
      </div>

      {!myProfile && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4 text-green-800">
          💚 Crea tu perfil de voluntariado para que podamos contar contigo en eventos y tareas del club.
        </div>
      )}

      <div className="grid gap-3">
        {opportunities.map((opp)=>{
          const count = signups.filter((s)=> s.opportunity_id === opp.id).length;
          return (
            <OpportunityCard key={opp.id} opp={opp} count={count} onSignup={()=>doSignup.mutate({ opp })} />
          );
        })}
      </div>

      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="sm:max-w-lg">
          <VolunteerProfileForm initial={myProfile||{ user_email: user?.email }} onSubmit={(payload)=>saveProfile.mutate(payload)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openOpp} onOpenChange={setOpenOpp}>
        <DialogContent className="sm:max-w-lg">
          <OpportunityForm onSubmit={(payload)=>createOpp.mutate(payload)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}