import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Carga los días marcados como "sin entrenamiento" (fiestas, puentes...)
export default function useSinEntrenamiento() {
  const { data = [] } = useQuery({
    queryKey: ["sinEntrenamiento"],
    queryFn: () => base44.entities.SinEntrenamiento.list("-fecha", 200).catch(() => []),
    staleTime: 300000,
    initialData: [],
  });
  return data;
}