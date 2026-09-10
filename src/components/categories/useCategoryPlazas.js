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

  const { data: players = [] } = useQuery({
    queryKey: ["playersPlazasCount"],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
    staleTime: 60000,
  });

  const contarOcupadas = (nombre) =>
    players.filter(
      (p) => p.deporte === nombre || (p.categorias || []).includes(nombre)
    ).length;

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