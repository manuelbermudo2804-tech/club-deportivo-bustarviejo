import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PracticasPlayerCard from "@/components/practicas/PracticasPlayerCard";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const n = new Date(fechaNac);
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad;
};

export default function EntrenadorPracticas() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["practicasCandidatos"],
    queryFn: async () => {
      const all = await base44.entities.Player.filter({ activo: true, acceso_menor_autorizado: true });
      return all.filter((p) => {
        const edad = calcularEdad(p.fecha_nacimiento);
        return edad !== null && edad >= 14 && edad < 18;
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ player, cambios }) => {
      const actual = player.entrenador_practicas || {};
      const nuevo = { ...actual, ...cambios };
      if (cambios.activo === true) {
        nuevo.activado_por = user?.email;
        nuevo.fecha_activacion = new Date().toISOString();
      }
      if (cambios.activo === false) {
        ["ver_horarios", "ver_convocatorias", "ver_nombres_convocatoria", "crear_convocatorias",
          "asistencia", "evaluaciones", "chat_staff", "ejercicios", "pizarra", "competicion"]
          .forEach((k) => { nuevo[k] = false; });
      }
      if (cambios.ver_convocatorias === false) {
        nuevo.ver_nombres_convocatoria = false;
        nuevo.crear_convocatorias = false;
      }
      return base44.entities.Player.update(player.id, { entrenador_practicas: nuevo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practicasCandidatos"] });
      toast.success("Permiso actualizado");
    },
    onError: () => toast.error("No se pudo guardar el cambio"),
  });

  const filtered = players.filter((p) =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria_principal || p.deporte || "").toLowerCase().includes(search.toLowerCase())
  );
  const activos = players.filter((p) => p.entrenador_practicas?.activo).length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
            <GraduationCap className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Formación y permisos juveniles</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Entrenadores en prácticas</h1>
            <p className="mt-1 text-sm text-slate-300">Gestiona los permisos de jugadores de 14 a 17 años de forma individual y controlada</p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-slate-700 sm:p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
          <p><strong className="text-slate-900">{activos} de {players.length}</strong> con el rol activo. Queda registrado quién concedió cada permiso y cuándo. Los permisos no incluyen datos personales, médicos, económicos ni chats con familias.</p>
        </CardContent>
      </Card>

      <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o equipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 focus-visible:ring-orange-500"
        />
      </div>

      {isLoading && <p className="text-sm text-slate-400">Cargando jugadores…</p>}

      {!isLoading && filtered.length === 0 && (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6 text-center text-slate-500 text-sm">
            No hay jugadores de 14 a 17 años con acceso juvenil activo.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((p) => (
          <PracticasPlayerCard
            key={p.id}
            player={p}
            saving={mutation.isPending}
            onChange={(player, cambios) => mutation.mutate({ player, cambios })}
          />
        ))}
      </div>
    </div>
  );
}