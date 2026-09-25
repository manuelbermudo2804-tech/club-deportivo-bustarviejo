import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Plazas ocupadas y disponibles por categoría.
 * Cuenta los jugadores activos de cada categoría y lo compara con el límite
 * configurado por el club (plazas_maximas) y con el interruptor manual
 * inscripciones_abiertas.
 */
export default function useCategoryPlazas() {
  const { data: configs = [] } = useQuery({
    queryKey: ["categoryConfigPlazas"],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true }),
    staleTime: 60000,
  });

  // El recuento lo hace el servidor: una familia solo puede ver a sus propios
  // jugadores, así que contar aquí daría siempre plazas libres.
  const { data: counts = {} } = useQuery({
    queryKey: ["playersPlazasCount"],
    queryFn: async () => {
      const { data } = await base44.functions.invoke("playerRenewalAction", { action: "plazas_estado" });
      return data?.counts || {};
    },
    staleTime: 30000,
  });

  const contarOcupadas = (nombre) => counts[nombre] || 0;

  /** Estado de una categoría: { limite, ocupadas, disponibles, completa, cerrada, bloqueada } */
  const getEstado = (nombre) => {
    const config = configs.find((c) => c.nombre === nombre);
    const limite = Number(config?.plazas_maximas) || 0;
    const ocupadas = contarOcupadas(nombre);
    const cerrada = config?.inscripciones_abiertas === false;
    const completa = limite > 0 && ocupadas >= limite;
    return {
      limite,
      ocupadas,
      disponibles: limite > 0 ? Math.max(0, limite - ocupadas) : null,
      completa,
      cerrada,
      bloqueada: completa || cerrada,
    };
  };

  return { configs, getEstado };
}