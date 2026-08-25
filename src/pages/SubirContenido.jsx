import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
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
    <div className="px-4 lg:px-8 py-6 max-w-xl mx-auto space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Camera className="w-7 h-7 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Envía fotos y vídeos al club</h1>
        <p className="text-slate-600 text-sm mt-2">
          ¿Has grabado un gol, una parada o un buen momento? Mándalo y el club decidirá qué publicar en redes.
        </p>
      </div>

      <SubirContenidoForm
        user={user}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["misContenidos"] })}
      />

      <MisEnviosList items={misEnvios} />
    </div>
  );
}