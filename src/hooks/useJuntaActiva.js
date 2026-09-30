import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Junta activa cuya fecha no ha pasado (margen de 6 h) + la respuesta del usuario
export default function useJuntaActiva(user) {
  const { data: junta } = useQuery({
    queryKey: ["juntaActiva"],
    queryFn: async () => {
      const list = await base44.entities.JuntaSocios.filter({ activa: true }, "fecha", 5);
      const limite = Date.now() - 6 * 3600000;
      return list.find((j) => new Date(j.fecha).getTime() > limite) || null;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: miRespuesta, refetch } = useQuery({
    queryKey: ["juntaMiRespuesta", junta?.id, user?.email],
    enabled: !!junta && !!user?.email,
    queryFn: async () => {
      const r = await base44.entities.JuntaAsistencia.filter({ junta_id: junta.id, email: user.email });
      return r[0] || null;
    },
  });

  return { junta, miRespuesta, refetch };
}