import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Carga los días marcados como "sin entrenamiento" (fiestas, puentes...)
// OJO: sin initialData — con initialData + staleTime, React Query considera
// la lista vacía como "fresca" y no llega a consultar los días marcados.
export default function useSinEntrenamiento() {
  const { data } = useQuery({
    queryKey: ["sinEntrenamiento"],
    queryFn: () => base44.entities.SinEntrenamiento.list("-fecha", 200).catch(() => []),
    staleTime: 300000,
  });
  return data || [];
}