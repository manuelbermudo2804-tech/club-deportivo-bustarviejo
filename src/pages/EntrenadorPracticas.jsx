import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap } from "lucide-react";
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
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-orange-600" />
          Entrenadores en prácticas
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Jugadores de 14 a 17 años con acceso juvenil. Vincúlalos al equipo que entrenan y activa los permisos uno a uno: nunca incluyen datos personales, médicos, económicos ni chats con familias.
        </p>
      </div>

      <Card className="border-none shadow-lg bg-blue-50">
        <CardContent className="p-4 text-sm text-blue-800">
          🛡️ <strong>{activos}</strong> de {players.length} con el rol activo. Queda registrado quién concedió cada permiso y cuándo.
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o equipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && <p className="text-sm text-slate-400">Cargando jugadores…</p>}

      {!isLoading && filtered.length === 0 && (
        <Card className="border-none shadow-lg">
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