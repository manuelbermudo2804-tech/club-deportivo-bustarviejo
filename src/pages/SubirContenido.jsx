import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus } from "lucide-react";
import SubirContenidoForm from "@/components/contenido/SubirContenidoForm";
import MisEnviosList from "@/components/contenido/MisEnviosList";

export default function SubirContenido() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: misEnvios = [] } = useQuery({
    queryKey: ["misContenidos", user?.email],
    queryFn: async () => {
      const all = await base44.entities.ContenidoClub.filter(
        { autor_email: user.email }, "-created_date", 20
      );
      return all || [];
    },
    enabled: !!user?.email,
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
            <Camera className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Participa en las redes del club</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Enviar fotos y vídeos</h1>
            <p className="mt-1 text-sm text-slate-300">Comparte goles, paradas y grandes momentos de tu equipo</p>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-slate-700 sm:p-5">
        <ImagePlus className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <p>Envía tus fotos o vídeos y el club revisará el material antes de decidir qué publicar en sus canales.</p>
      </div>

      <SubirContenidoForm
        user={user}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["misContenidos"] })}
      />

      <MisEnviosList items={misEnvios} />
    </div>
  );
}