import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Trophy, Star, Users, Coins, Heart } from "lucide-react";

const PASOS = [
  { icon: "📝", titulo: "Apúntate", texto: "Rellena tu nombre, email y elige el alias de tu equipo." },
  { icon: "💳", titulo: "Paga la entrada", texto: "Pago seguro con tarjeta vía Stripe. Recibes link mágico por email." },
  { icon: "⚽", titulo: "Predice los grupos", texto: "12 grupos × 6 partidos = 72 predicciones 1/X/2. Resuelve empates." },
  { icon: "🏆", titulo: "Monta el bracket", texto: "16avos, 8vos, cuartos, semis, 3er puesto y FINAL." },
  { icon: "⭐", titulo: "Predicciones especiales", texto: "Mejor jugador, máximo goleador, mejor portero, mejor joven." },
  { icon: "🥇", titulo: "Gana premios", texto: "Sigue el ranking en directo. Premios al 1º, 2º y 3º del bote." },
];

const PUNTOS = [
  { tipo: "Acertar 1/X/2 (fase grupos)", pts: 3 },
  { tipo: "Equipo en 16avos", pts: 4 },
  { tipo: "Equipo en 8vos", pts: 6 },
  { tipo: "Equipo en cuartos", pts: 10 },
  { tipo: "Equipo en semis", pts: 14 },
  { tipo: "Equipo en final", pts: 20 },
  { tipo: "🏆 Campeón del Mundial", pts: 25 },
  { tipo: "Cada equipo en 3er puesto", pts: 10 },
  { tipo: "Acertar ganador 3er puesto", pts: 14 },
  { tipo: "⭐ Cada predicción especial", pts: 10 },
];

export default function PorraComoFunciona({ config }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
      {/* Pasos */}
      <div className="text-center mb-10">
        <span className="text-sm font-bold text-orange-600 uppercase tracking-widest">¿Cómo funciona?</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-2">
          Tan fácil como <span className="text-orange-600">acertar un penalti</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {PASOS.map((paso, i) => (
          <Card key={i} className="border-2 border-orange-100 hover:border-orange-400 hover:shadow-xl transition-all group">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-5xl group-hover:scale-110 transition-transform">{paso.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">PASO {i + 1}</span>
                  </div>
                  <h3 className="font-black text-lg text-slate-900 mb-1">{paso.titulo}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{paso.texto}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sistema de puntos */}
      <div className="bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 rounded-3xl p-6 md:p-10 text-white shadow-2xl mb-16">
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 mx-auto text-yellow-400 mb-3" />
          <h3 className="text-3xl md:text-4xl font-black mb-2">Sistema de Puntos</h3>
          <p className="text-white/70">Cuanto más aciertes, más puntos sumas</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {PUNTOS.map((p, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between border border-white/20">
              <span className="text-sm md:text-base font-medium">{p.tipo}</span>
              <span className="bg-yellow-400 text-red-900 font-black px-3 py-1 rounded-lg text-sm">+{p.pts} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Por qué nuestra porra */}
      <div className="text-center mb-10">
        <span className="text-sm font-bold text-orange-600 uppercase tracking-widest">¿Por qué nuestra porra?</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-2">
          No es una porra más, es <span className="text-orange-600">la del pueblo</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6 text-center">
            <Heart className="w-12 h-12 mx-auto text-green-600 mb-3" />
            <h3 className="font-black text-lg mb-2">Apoyas al club</h3>
            <p className="text-sm text-slate-700">
              El <strong>{config?.comision_club_porcentaje || 10}%</strong> de cada entrada va destinado a <strong>{config?.destino_comision_club || 'el club'}</strong>. Juegas y ayudas.
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 mx-auto text-blue-600 mb-3" />
            <h3 className="font-black text-lg mb-2">Mini-ligas privadas</h3>
            <p className="text-sm text-slate-700">
              Crea tu liga con la peña del bar, la familia o los compañeros del trabajo. <strong>Ranking propio</strong>.
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50">
          <CardContent className="p-6 text-center">
            <Star className="w-12 h-12 mx-auto text-purple-600 mb-3" />
            <h3 className="font-black text-lg mb-2">Múltiples porras</h3>
            <p className="text-sm text-slate-700">
              Haz <strong>todas las porras que quieras</strong> con distintas predicciones. Más oportunidades de ganar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}