import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TEMAS_FESTIVOS } from "@/components/festivo/temasFestivos";

// Devuelve el tema festivo activado por el admin (o null). ?epoca=navidad fuerza una vista previa.
export default function useTemaFestivo() {
  const { data: registro } = useQuery({
    queryKey: ["temaFestivo"],
    queryFn: async () => (await base44.entities.TemaFestivo.list("-updated_date", 1))[0] || null,
    staleTime: 5 * 60 * 1000,
  });

  const forzado = new URLSearchParams(window.location.search).get("epoca");
  const clave = TEMAS_FESTIVOS[forzado] ? forzado : registro?.tema;
  if (!clave || !TEMAS_FESTIVOS[clave]) return { registro, tema: null };

  return {
    registro,
    clave,
    tema: TEMAS_FESTIVOS[clave],
    mensaje: registro?.mensaje || TEMAS_FESTIVOS[clave].mensaje,
    particulas: forzado ? true : registro?.particulas !== false,
  };
}