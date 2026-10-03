import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useReconocimientos(enabled = true) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["reconocimientos"],
    queryFn: () => base44.entities.ReconocimientoMedico.list("-created_date", 2000),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  });
  const byJugador = Object.fromEntries(data.filter((r) => !(r.categoria || "").toLowerCase().includes("baloncesto")).map((r) => [r.jugador_id, r]));
  return { list: data, byJugador, isLoading };
}