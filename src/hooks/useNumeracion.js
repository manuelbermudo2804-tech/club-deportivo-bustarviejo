import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const pad = (n) => String(n).padStart(3, "0");
const FORMATOS = {
  recibo: (a, n) => `${pad(n)}/${a}`,
  factura: (a, n) => `${a}/${pad(n)}`,
  presupuesto: (a, n) => `P-${a}/${pad(n)}`,
};

// Numeración correlativa por año. "confirmar" solo suma si se usó el número sugerido.
export default function useNumeracion(tipo) {
  const anio = new Date().getFullYear();
  const [registro, setRegistro] = useState(null);
  const [sugerido, setSugerido] = useState("");

  useEffect(() => {
    base44.entities.DocumentoNumeracion.filter({ tipo, anio }).then((items) => {
      const r = items[0] || null;
      setRegistro(r);
      setSugerido(FORMATOS[tipo](anio, (r?.ultimo || 0) + 1));
    });
  }, [tipo, anio]);

  const confirmar = async (numeroUsado) => {
    if (!sugerido || numeroUsado !== sugerido) return;
    const ultimo = (registro?.ultimo || 0) + 1;
    const r = registro
      ? await base44.entities.DocumentoNumeracion.update(registro.id, { ultimo })
      : await base44.entities.DocumentoNumeracion.create({ tipo, anio, ultimo });
    setRegistro({ ...(registro || r), id: registro?.id || r.id, ultimo });
    setSugerido(FORMATOS[tipo](anio, ultimo + 1));
  };

  return { sugerido, confirmar };
}