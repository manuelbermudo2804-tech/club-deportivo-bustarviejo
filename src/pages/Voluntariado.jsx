import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VolunteerSignupForm from "../components/volunteer/VolunteerSignupForm";
import OpportunityCard from "../components/volunteer/OpportunityCard";

export default function Voluntariado() {
  const [user, setUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [opps, setOpps] = useState([]);
  const [showNewOpp, setShowNewOpp] = useState(false);
  const [newOpp, setNewOpp] = useState({ titulo: "", descripcion: "", categoria: "evento", fecha: "", hora: "", ubicacion: "", cupo: 0 });

  const load = async () => {
    const u = await base44.auth.me();
    setUser(u);
    setIsStaff(u?.role === 'admin' || u?.es_entrenador || u?.es_coordinador);
    const [p, o] = await Promise.all([
      base44.entities.VolunteerProfile.list(),
      base44.entities.VolunteerOpportunity.filter({ estado: 'abierta', publicada: true })
    ]);
    setProfiles(p || []);
    setOpps(o || []);
  };

  useEffect(() => { load(); }, []);

  const createProfile = async (data) => {
    await base44.entities.VolunteerProfile.create({
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      relacion: data.relacion === 'yo' ? (user?.es_jugador ? 'jugador' : 'padre') : data.relacion,
      areas: ["eventos"],
      disponibilidad: data.mensaje || ""
    });
    await load();
  };

  const signupToOpp = async (opp, data) => {
    await base44.entities.VolunteerSignup.create({
      opportunity_id: opp.id,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      relacion: data.relacion,
      mensaje: data.mensaje || "",
      fecha_inscripcion: new Date().toISOString()
    });
    alert("¡Te has apuntado! Gracias por apoyar al club");
  };

  const saveOpp = async () => {
    await base44.entities.VolunteerOpportunity.create(newOpp);
    setShowNewOpp(false);
    setNewOpp({ titulo: "", descripcion: "", categoria: "evento", fecha: "", hora: "", ubicacion: "", cupo: 0 });
    await load();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">🤝 Voluntariado CD Bustarviejo</h1>
        <p className="text-slate-600">Apúntate para ayudar en eventos y en el día a día. ¡Tu apoyo marca la diferencia!</p>
      </div>

      {!isStaff && (
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">📋 Apúntate a la base de voluntarios</CardTitle>
          </CardHeader>
          <CardContent>
            <VolunteerSignupForm onSubmit={createProfile} defaultEmail={user?.email} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Oportunidades abiertas</h2>
          {isStaff && (
            <Button onClick={() => setShowNewOpp(v => !v)} variant="outline">{showNewOpp ? 'Cancelar' : 'Nueva oportunidad'}</Button>
          )}
        </div>
        {showNewOpp && isStaff && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input placeholder="Título" value={newOpp.titulo} onChange={e => setNewOpp({ ...newOpp, titulo: e.target.value })} />
              <Input placeholder="Categoría (evento/dia_a_dia)" value={newOpp.categoria} onChange={e => setNewOpp({ ...newOpp, categoria: e.target.value })} />
              <Input placeholder="Fecha (YYYY-MM-DD)" value={newOpp.fecha} onChange={e => setNewOpp({ ...newOpp, fecha: e.target.value })} />
              <Input placeholder="Hora (ej: 10:00)" value={newOpp.hora} onChange={e => setNewOpp({ ...newOpp, hora: e.target.value })} />
              <Input placeholder="Ubicación" value={newOpp.ubicacion} onChange={e => setNewOpp({ ...newOpp, ubicacion: e.target.value })} />
              <Input type="number" placeholder="Cupo" value={newOpp.cupo} onChange={e => setNewOpp({ ...newOpp, cupo: Number(e.target.value) })} />
            </div>
            <Input placeholder="Descripción" value={newOpp.descripcion} onChange={e => setNewOpp({ ...newOpp, descripcion: e.target.value })} className="mt-2" />
            <div className="flex justify-end mt-3"><Button onClick={saveOpp} className="bg-green-600 hover:bg-green-700">Publicar</Button></div>
          </Card>
        )}
        <div className="grid gap-3">
          {opps.map(o => (
            <OpportunityCard key={o.id} item={o} onSignupClick={(it) => {
              const container = document.createElement('div');
              const root = document.createElement('div');
              container.appendChild(root);
              document.body.appendChild(container);
              const close = () => document.body.removeChild(container);
              const Modal = () => (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={close}>
                  <div className="bg-white rounded-2xl p-4 w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold mb-2">Apuntarme a: {it.titulo}</h3>
                    <VolunteerSignupForm onSubmit={async (data) => { await signupToOpp(it, data); close(); }} defaultEmail={user?.email} />
                  </div>
                </div>
              );
              import("react-dom").then(({ createRoot }) => createRoot(root).render(<Modal />));
            }} />
          ))}
        </div>
      </div>

      {isStaff && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">📚 Base de voluntarios</h2>
          <div className="grid gap-2">
            {profiles.map(p => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.nombre}</div>
                    <div className="text-sm text-slate-600">{p.email} · {p.telefono} · {p.relacion}</div>
                  </div>
                  <div className="text-xs text-slate-500 max-w-sm">{p.disponibilidad}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}