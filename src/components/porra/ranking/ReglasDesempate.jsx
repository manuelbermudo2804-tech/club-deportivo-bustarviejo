import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Trophy, Star, Medal, Award, CalendarClock, Target } from "lucide-react";

// Modal con la explicación de las 6 reglas de desempate
// Se muestra al pulsar el botón "ℹ️ Reglas de desempate" en el ranking
export default function ReglasDesempate({ trigger }) {
  const [open, setOpen] = useState(false);

  const reglas = [
    { icon: <Trophy className="w-5 h-5 text-yellow-600" />, titulo: '1. Acertar al campeón', desc: 'Si has clavado quién gana el Mundial, ganas el desempate.' },
    { icon: <Medal className="w-5 h-5 text-orange-600" />, titulo: '2. Tramo final (campeón + 3er puesto)', desc: 'Más puntos sumados en los partidos decisivos: ganador y partido por el bronce.' },
    { icon: <Star className="w-5 h-5 text-purple-600" />, titulo: '3. Predicciones especiales', desc: 'Mejor jugador, máximo goleador, mejor portero y mejor joven.' },
    { icon: <Target className="w-5 h-5 text-blue-600" />, titulo: '4. Resto de eliminatorias', desc: 'Mejor bracket completo: 16avos, octavos, cuartos, semis y final.' },
    { icon: <Award className="w-5 h-5 text-green-600" />, titulo: '5. Fase de grupos (1X2)', desc: 'Más aciertos en los 72 partidos de la fase de grupos + mejores terceros.' },
    { icon: <CalendarClock className="w-5 h-5 text-slate-600" />, titulo: '6. Fecha de inscripción', desc: 'Si todo lo anterior sigue empatado, gana quien se apuntó antes a la porra.' },
  ];

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Info className="w-6 h-6 text-orange-600" />
              Reglas de desempate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-slate-600">
              Cuando varias porras quedan con los <strong>mismos puntos totales</strong>, aplicamos estas reglas <strong>en cascada</strong>. Se aplican a todos los puestos del ranking (no solo el 1º):
            </p>
            <div className="space-y-2">
              {reglas.map((r, i) => (
                <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-shrink-0 mt-0.5">{r.icon}</div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{r.titulo}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>💡 Garantizado:</strong> el sistema siempre devuelve un ganador único en cada puesto. No hay sorteos ni premios compartidos.
            </div>
            <Button onClick={() => setOpen(false)} className="w-full" variant="outline">Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper: traducir el código de motivo de desempate a texto legible
export function getMotivoDesempateTexto(motivo) {
  const textos = {
    'campeon_acertado': '✅ Acertó al campeón',
    'campeon_fallado': '❌ No acertó al campeón',
    'tramo_final': '🏆 Mejor tramo final',
    'tramo_final_perdido': '⬇️ Peor tramo final',
    'especiales': '⭐ Mejores especiales',
    'especiales_perdido': '⬇️ Peores especiales',
    'eliminatorias': '⚔️ Mejor bracket',
    'eliminatorias_perdido': '⬇️ Peor bracket',
    'grupos': '📊 Más aciertos en grupos',
    'grupos_perdido': '⬇️ Menos aciertos en grupos',
    'inscripcion': '⏰ Se apuntó antes',
  };
  return textos[motivo] || null;
}