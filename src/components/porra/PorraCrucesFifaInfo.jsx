import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info, ChevronDown, ChevronUp, Trophy } from "lucide-react";

/**
 * Explicación oficial de los cruces de Ronda de 32 del Mundial FIFA 2026.
 * El Mundial 2026 tiene 48 equipos y una RONDA NUEVA (16avos) donde pasan
 * los 12 primeros, 12 segundos y los 8 mejores terceros. Los cruces NO son
 * "1º vs mejor 3º" en todos los partidos: la FIFA tiene tablas predefinidas
 * (Anexo C del reglamento) que mezclan partidos 1º-2º, 2º-2º y 1º-3º.
 */
export default function PorraCrucesFifaInfo({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-sky-50 mb-4">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(!open)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-blue-100/50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="font-black text-slate-900">
                ⚠️ ¿Por qué los cruces no son "1º vs Mejor 3º"?
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Pulsa para ver cómo son los cruces oficiales FIFA del Mundial 2026
              </p>
            </div>
          </div>
          {open ? (
            <ChevronUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
        </button>

        {open && (
          <div className="px-5 pb-5 pt-2 space-y-4 border-t border-blue-200">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>El Mundial 2026 es nuevo y diferente.</strong> Tiene <strong>48 equipos</strong> (antes 32)
                y por eso hay una <strong>ronda nueva: la Ronda de 32 (dieciseisavos)</strong>.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mt-2">
                Pasan a la siguiente fase: <strong>12 primeros + 12 segundos + los 8 mejores terceros</strong> de los 12 grupos.
              </p>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>⚠️ Lo que mucha gente piensa (y NO es así):</strong>
              </p>
              <p className="text-sm text-amber-900 leading-relaxed mt-1">
                "Los 8 primeros se enfrentan a los 8 mejores terceros".
              </p>
              <p className="text-sm text-amber-900 leading-relaxed mt-2">
                <strong>❌ No es correcto.</strong> La FIFA tiene unas tablas oficiales (Anexo C del reglamento)
                con los 16 cruces predefinidos, y solo <strong>8 de ellos</strong> son contra "Mejor 3º".
                Los otros 8 son entre 1º y 2º de grupos concretos.
              </p>
            </div>

            <div>
              <h5 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-orange-600" />
                Los 16 cruces oficiales FIFA:
              </h5>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 mb-2">
                    8 PARTIDOS "FIJOS" (1º vs 2º o 2º vs 2º)
                  </p>
                  <ul className="text-xs text-slate-700 space-y-1 font-mono">
                    <li>M73: 2ºA vs 2ºB</li>
                    <li>M75: 1ºF vs 2ºC</li>
                    <li>M76: 1ºC vs 2ºF</li>
                    <li>M78: 2ºE vs 2ºI</li>
                    <li>M83: 2ºK vs 2ºL</li>
                    <li>M84: 1ºH vs 2ºJ</li>
                    <li>M86: 1ºJ vs 2ºH</li>
                    <li>M88: 2ºD vs 2ºG</li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-xs font-bold text-purple-700 mb-2">
                    8 PARTIDOS CONTRA "MEJOR 3º"
                  </p>
                  <ul className="text-xs text-slate-700 space-y-1 font-mono">
                    <li>M74: 1ºE vs Mejor 3º</li>
                    <li>M77: 1ºI vs Mejor 3º</li>
                    <li>M79: 1ºA vs Mejor 3º</li>
                    <li>M80: 1ºL vs Mejor 3º</li>
                    <li>M81: 1ºD vs Mejor 3º</li>
                    <li>M82: 1ºG vs Mejor 3º</li>
                    <li>M85: 1ºB vs Mejor 3º</li>
                    <li>M87: 1ºK vs Mejor 3º</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <p className="text-sm text-green-900 leading-relaxed">
                <strong>✅ Conclusión:</strong> Los cruces que tienes en la porra son <strong>los oficiales FIFA</strong>,
                idénticos a los que verás en cualquier bracket público del Mundial. Si quieres comprobarlo,
                puedes mirarlo en <strong>FIFA.com</strong> o en la Wikipedia del Mundial 2026.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}