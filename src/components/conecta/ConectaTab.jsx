import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Heart, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ConectaProfileForm from "./ConectaProfileForm";
import ConectaCard from "./ConectaCard";
import ConectaFiltroSelect from "./ConectaFiltroSelect";
import { getInteresLabel } from "./conectaIntereses";

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

  const visibles = profiles.filter(p => p.email !== user?.email && p.activo !== false);

  const counts = {};
  visibles.forEach(p => (p.intereses || []).forEach(i => { counts[i] = (counts[i] || 0) + 1; }));

  const otros = visibles
    .filter(p => !filtro || (p.intereses || []).includes(filtro))
    .map(p => ({ ...p, comunes: (p.intereses || []).filter(i => misIntereses.includes(i)).length }))
    .sort((a, b) => b.comunes - a.comunes);

  return (
    <div className="space-y-5">
      {/* Mi perfil */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-4 text-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex"
              >
                <Heart className="w-4 h-4 fill-white" />
              </motion.span>
              Conecta con otras familias
            </h3>
            <p className="text-green-50 text-sm mt-1">
              Comparte tus aficiones (correr, ciclismo, pádel, senderismo...) y encuentra familias del club con tus mismos planes.
            </p>
            {myProfile && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {misIntereses.map(i => (
                  <Badge key={i} className="bg-white/20 text-white text-[10px]">{getInteresLabel(i)}</Badge>
                ))}
              </div>
            )}
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex-shrink-0">
            <Button size="sm" onClick={() => setOpenForm(true)} className="bg-white text-green-700 hover:bg-green-50 shadow">
              {myProfile ? <><Pencil className="w-4 h-4 mr-1" /> Editar</> : <><Sparkles className="w-4 h-4 mr-1" /> Apuntarme</>}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Filtro desplegable */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ConectaFiltroSelect value={filtro} onChange={setFiltro} counts={counts} />
        <span className="text-xs text-slate-500">{otros.length} familia{otros.length === 1 ? "" : "s"}</span>
      </div>

      {/* Listado */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Cargando familias...</div>
      ) : otros.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-slate-500 bg-white rounded-xl border"
        >
          {filtro ? "Nadie se ha apuntado todavía a este interés." : "Aún no hay familias apuntadas. ¡Sé la primera y anima al resto!"}
        </motion.div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {otros.map((p, idx) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.28, delay: Math.min(idx * 0.04, 0.3) }}
                whileHover={{ y: -3 }}
              >
                <ConectaCard profile={p} misIntereses={misIntereses} />
              </motion.div>
            ))}
          </AnimatePresence>
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