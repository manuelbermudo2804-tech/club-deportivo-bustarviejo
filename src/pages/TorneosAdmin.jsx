import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Settings, Trash2, Calendar, Medal } from "lucide-react";
import { toast } from "sonner";
import TorneoForm from "@/components/torneos/TorneoForm";

const ESTADO_COLOR = {
  borrador: "bg-slate-100 text-slate-600",
  publicado: "bg-blue-100 text-blue-700",
  en_curso: "bg-green-100 text-green-700",
  finalizado: "bg-amber-100 text-amber-700",
  archivado: "bg-slate-100 text-slate-400",
};

export default function TorneosAdmin() {
  const queryClient = useQueryClient();
  const [creando, setCreando] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === "admin";

  const { data: torneos = [], isLoading } = useQuery({
    queryKey: ["torneos"],
    queryFn: () => base44.entities.Torneo.list("-created_date"),
    enabled: isAdmin,
  });

  const crear = useMutation({
    mutationFn: (data) => base44.entities.Torneo.create({ ...data, creado_por: user?.email }),
    onSuccess: () => { setCreando(false); queryClient.invalidateQueries({ queryKey: ["torneos"] }); toast.success("Torneo creado"); },
    onError: (e) => toast.error(e?.message?.includes("slug") ? "Ese identificador ya existe" : "Error al crear"),
  });

  const eliminar = useMutation({
    mutationFn: (id) => base44.entities.Torneo.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["torneos"] }); toast.success("Torneo eliminado"); },
  });

  if (!isAdmin) {
    return <div className="p-6 text-center text-slate-500">Solo administradores.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 px-5 py-6 shadow-lg sm:px-7 sm:py-7">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-orange-500/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-500/15">
              <Trophy className="h-6 w-6 text-orange-300" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Competición</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Torneos</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Crea y organiza torneos multideporte, sus sedes, fechas y sistemas de puntuación.</p>
            </div>
          </div>
          {!creando && (
            <Button onClick={() => setCreando(true)} className="w-full shrink-0 bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
              <Plus className="mr-1 h-4 w-4" /> Nuevo torneo
            </Button>
          )}
        </div>
      </section>

      {creando && (
        <TorneoForm
          onSave={(data) => crear.mutate(data)}
          onCancel={() => setCreando(false)}
          isSaving={crear.isPending}
        />
      )}

      {isLoading ? (
        <p className="text-center text-slate-400 py-8">Cargando...</p>
      ) : torneos.length === 0 && !creando ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-slate-500">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"><Trophy className="h-7 w-7" /></div>
          <p className="font-semibold text-slate-800">Todavía no hay torneos</p>
          <p className="mt-1 text-sm">Crea el primero para empezar a configurar la competición.</p>
          <Button onClick={() => setCreando(true)} className="mt-4 bg-orange-500 text-white hover:bg-orange-600"><Plus className="mr-1 h-4 w-4" /> Crear torneo</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {torneos.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 truncate">{t.nombre}</span>
                    <Badge className={ESTADO_COLOR[t.estado] || ""} variant="secondary">{t.estado}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{t.deporte}</span>
                    {t.fecha_inicio && <span className="inline-flex items-center gap-0.5"><Calendar className="w-3 h-3" />{t.fecha_inicio}</span>}
                  </p>
                </div>
                <Link to={createPageUrl("TorneoManager") + `?id=${t.id}`}>
                  <Button variant="outline" size="sm"><Settings className="w-4 h-4 mr-1" /> Gestionar</Button>
                </Link>
                <Button variant="ghost" size="icon" className="text-red-400 h-8 w-8"
                  onClick={() => { if (confirm(`¿Eliminar "${t.nombre}"?`)) eliminar.mutate(t.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}