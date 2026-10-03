import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useReconocimientos() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["reconocimientos"],
    queryFn: () => base44.entities.ReconocimientoMedico.list("-created_date", 2000),
    staleTime: 5 * 60 * 1000,
  });
  const byJugador = Object.fromEntries(data.map((r) => [r.jugador_id, r]));
  return { list: data, byJugador, isLoading };
}