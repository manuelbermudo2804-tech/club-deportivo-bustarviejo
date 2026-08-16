import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Heart, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ConectaProfileForm from "./ConectaProfileForm";
import ConectaCard from "./ConectaCard";
import { INTERESES, getInteresLabel } from "./conectaIntereses";

export default function ConectaTab({ user }) {
  const qc = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [filtro, setFiltro] = useState(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["family_connections"],
    queryFn: () => base44.entities.FamilyConnection.list("-updated_date", 300),
  });

  const myProfile = profiles.find(p => p.email === user?.email) || null;
  const misIntereses = myProfile?.intereses || [];

  const save = useMutation({
    mutationFn: (payload) => myProfile
      ? base44.entities.FamilyConnection.update(myProfile.id, payload)
      : base44.entities.FamilyConnection.create({ ...payload, email: user.email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family_connections"] });
      setOpenForm(false);
      toast.success("Perfil guardado ✅");
    },
    onError: () => toast.error("No se pudo guardar el perfil"),
  });

  const otros = profiles
    .filter(p => p.email !== user?.email && p.activo !== false)
    .filter(p => !filtro || (p.intereses || []).includes(filtro))
    .map(p => ({ ...p, comunes: (p.intereses || []).filter(i => misIntereses.includes(i)).length }))
    .sort((a, b) => b.comunes - a.comunes);

  return (
    <div className="space-y-5">
      {/* Mi perfil */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold flex items-center gap-2"><Heart className="w-4 h-4" /> Conecta con otras familias</h3>
            <p className="text-green-50 text-sm mt-1">
              Comparte tus intereses (correr, ciclismo, pádel, compartir coche, ayudar en eventos...) y encuentra familias del club con tus mismos planes.
            </p>
            {myProfile && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {misIntereses.map(i => (
                  <Badge key={i} className="bg-white/20 text-white text-[10px]">{getInteresLabel(i)}</Badge>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" onClick={() => setOpenForm(true)} className="bg-white text-green-700 hover:bg-green-50 flex-shrink-0">
            {myProfile ? <><Pencil className="w-4 h-4 mr-1" /> Editar</> : <><Sparkles className="w-4 h-4 mr-1" /> Apuntarme</>}
          </Button>
        </div>
      </div>

      {/* Filtros por interés */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFiltro(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${!filtro ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-700"}`}
        >
          Todos
        </button>
        {INTERESES.map(i => (
          <button
            key={i.id}
            type="button"
            onClick={() => setFiltro(filtro === i.id ? null : i.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${filtro === i.id ? "bg-green-600 border-green-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-green-300"}`}
          >
            {i.label}
          </button>
        ))}
      </div>

      {/* Listado */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Cargando familias...</div>
      ) : otros.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-white rounded-xl border">
          {filtro ? "Nadie se ha apuntado todavía a este interés." : "Aún no hay familias apuntadas. ¡Sé la primera y anima al resto!"}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {otros.map(p => (
            <ConectaCard key={p.id} profile={p} misIntereses={misIntereses} />
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{myProfile ? "Editar mi perfil" : "Apuntarme a Conecta"}</DialogTitle>
          </DialogHeader>
          <ConectaProfileForm
            initial={myProfile || { nombre: user?.full_name || "" }}
            onSubmit={(payload) => save.mutate(payload)}
            isSaving={save.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}