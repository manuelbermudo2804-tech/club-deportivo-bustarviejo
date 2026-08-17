import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Hourglass, ShoppingBag } from "lucide-react";

/**
 * Explica a la familia qué pasa DESPUÉS de terminar la inscripción:
 *  - Si la categoría compite en liga → espera la asignación de dorsal por el club.
 *  - Siempre → tiene que comprar el pack obligatorio en Tienda y Equipación.
 */
export default function PostInscripcionPasos({ categoria }) {
  const [compite, setCompite] = useState(null);

  useEffect(() => {
    if (!categoria) return;
    let cancelled = false;
    base44.entities.CategoryConfig.filter({ nombre: categoria })
      .then((list) => {
        if (!cancelled) setCompite(list?.[0]?.compite_en_liga === true);
      })
      .catch(() => { if (!cancelled) setCompite(false); });
    return () => { cancelled = true; };
  }, [categoria]);

  return (
    <>
      {compite && (
        <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-blue-300">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Hourglass className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-blue-900 mb-1">Espera la asignación de dorsal</p>
            <p className="text-sm text-blue-800">
              El club asigna los dorsales una vez revisada la inscripción. No tienes que hacer nada:
              te avisaremos por la app cuando el dorsal esté asignado.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-orange-300">
        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-orange-900 mb-1">Compra el pack obligatorio de equipación</p>
          <p className="text-sm text-orange-800 mb-3">
            Todas las categorías tienen su pack obligatorio. Lo encontrarás en la sección
            <strong> Tienda y Equipación</strong>{compite ? ", donde también verás el dorsal cuando el club te lo asigne." : "."}
          </p>
          <Link to={createPageUrl("Tienda")}>
            <Button variant="outline" size="sm" className="border-orange-400 text-orange-800">
              Ir a Tienda y Equipación
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}