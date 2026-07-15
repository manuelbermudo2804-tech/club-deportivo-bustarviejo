import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Settings, Trash2, Calendar } from "lucide-react";
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
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Torneos
          </h1>
          <p className="text-slate-500 text-sm">Constructor de torneos multideporte</p>
        </div>
        {!creando && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo torneo
          </Button>
        )}
      </div>

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
        <div className="text-center py-12 text-slate-400">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aún no hay torneos. Crea el primero.</p>
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