import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, Users, Heart, HelpCircle, CheckCircle2, XCircle, Sparkles } from "lucide-react";

const PASOS = [
  { icon: "📝", titulo: "Apúntate", texto: "Pon tu nombre, tu email y el nombre divertido que quieras para tu equipo (ej: \"Los Cracks de Busta\")." },
  { icon: "💳", titulo: "Paga la entrada", texto: "Pago seguro con tarjeta. Recibes un enlace mágico en tu email para editar tu porra cuando quieras." },
  { icon: "⚽", titulo: "Predice los partidos de grupos", texto: "Para cada partido eliges: 1 (gana el de casa), X (empatan) o 2 (gana el visitante). Súper sencillo." },
  { icon: "🥉", titulo: "Elige los 8 mejores terceros", texto: "De los 12 equipos que quedan 3º en su grupo, marca los 8 que crees que pasarán a la siguiente fase." },
  { icon: "🏆", titulo: "Monta tu bracket", texto: "Ve eligiendo quién gana cada cruce: 16avos → 8vos → cuartos → semis → ¡FINAL!" },
  { icon: "🥇", titulo: "Sigue el ranking", texto: "A medida que se juegan los partidos del Mundial, tus puntos suben. ¡Quien más acierte, gana!" },
];

const PUNTOS = [
  { tipo: "Acertar 1/X/2 de un partido de grupos", pts: 3 },
  { tipo: "Cada equipo que acertaste que llega a 16avos", pts: 4 },
  { tipo: "Cada equipo que acertaste que llega a 8vos", pts: 6 },
  { tipo: "Cada equipo que acertaste que llega a cuartos", pts: 10 },
  { tipo: "Cada equipo que acertaste que llega a semis", pts: 14 },
  { tipo: "Cada equipo que acertaste que llega a la final", pts: 20 },
  { tipo: "🏆 Acertar el CAMPEÓN del Mundial", pts: 25 },
  { tipo: "Cada equipo que juega el 3er puesto", pts: 10 },
  { tipo: "Acertar quién gana el 3er puesto", pts: 14 },
  { tipo: "⭐ Cada predicción especial (goleador, MVP...)", pts: 10 },
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
        <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
          No hace falta saber de fútbol ni ser un experto. Si sabes lo que es <strong>"1, X, 2"</strong> y reconoces banderas, ¡ya puedes jugar! 🎉
        </p>
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

      {/* EXPLICACIÓN VISUAL: cómo se ganan puntos */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Lo más importante</span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-2">
            ¿Cómo se <span className="text-blue-600">ganan los puntos</span>?
          </h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Te lo explicamos con ejemplos. ¡Verás que es facilísimo!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Bloque 1: fase de grupos */}
          <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-black">1</div>
                <h3 className="font-black text-lg text-slate-900">En la fase de grupos</h3>
              </div>
              <p className="text-sm text-slate-700 mb-4">
                Por cada partido tú dices <strong>1</strong>, <strong>X</strong> o <strong>2</strong>.
                Cuando se juega de verdad, el sistema compara:
              </p>
              <div className="space-y-2">
                <div className="bg-white rounded-lg p-3 border border-green-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <p>Tú dijiste <strong>1</strong> (España gana) y España ganó</p>
                    <p className="text-green-700 font-bold">→ +3 puntos ✅</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-200 flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <p>Tú dijiste <strong>X</strong> (empate) y ganó el otro</p>
                    <p className="text-red-600 font-bold">→ 0 puntos ❌</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-3 italic">
                Hay 72 partidos de grupos, ¡muchos para acertar!
              </p>
            </CardContent>
          </Card>

          {/* Bloque 2: eliminatorias - LA CLAVE */}
          <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-fuchsia-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-black">2</div>
                <h3 className="font-black text-lg text-slate-900">En las eliminatorias</h3>
              </div>
              <p className="text-sm text-slate-700 mb-4">
                Aquí <strong>NO importa fallar uno</strong>. Lo que cuenta es:
                ¿cuántos de los equipos que dijiste que llegarían a esa fase, llegaron de verdad?
              </p>
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <p className="text-xs font-bold text-purple-700 mb-2">EJEMPLO REAL:</p>
                <p className="text-sm text-slate-700 mb-2">
                  Tú dijiste que estos equipos llegarían a <strong>cuartos de final</strong>:
                </p>
                <p className="text-2xl my-2">🇦🇷 🇪🇸 🇫🇷 🇧🇷 🇩🇪 🇵🇹 🇮🇹 🇳🇱</p>
                <p className="text-sm text-slate-700 mb-2">
                  Llegaron de verdad <strong>6 de ellos</strong> (España y Holanda cayeron antes):
                </p>
                <p className="text-2xl my-2">🇦🇷 ❌ 🇫🇷 🇧🇷 🇩🇪 🇵🇹 🇮🇹 ❌</p>
                <p className="text-sm font-bold text-purple-700 mt-2">
                  → 6 equipos × 10 pts = <span className="text-lg">60 puntos</span> 🎉
                </p>
              </div>
              <p className="text-xs text-slate-600 mt-3 italic">
                ¡Aunque falles alguno, sigues sumando un montón!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Aclaración mega importante */}
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-black text-amber-900 mb-1">🌟 ¡Lo más importante de todo!</h4>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>NADIE se queda fuera por fallar.</strong> Si tu equipo favorito cae en grupos,
                  <strong> sigues sumando puntos</strong> por los demás equipos que sí acertaste en cada fase.
                  El que más cosas acierte en total, ¡gana! 🏆
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de puntos (tabla) */}
      <div className="bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 rounded-3xl p-6 md:p-10 text-white shadow-2xl mb-16">
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 mx-auto text-yellow-400 mb-3" />
          <h3 className="text-3xl md:text-4xl font-black mb-2">Tabla de puntos</h3>
          <p className="text-white/70">Cuanto más avance la fase, ¡más puntos valen los aciertos!</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {PUNTOS.map((p, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between border border-white/20">
              <span className="text-sm md:text-base font-medium">{p.tipo}</span>
              <span className="bg-yellow-400 text-red-900 font-black px-3 py-1 rounded-lg text-sm flex-shrink-0 ml-2">+{p.pts} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ rápido */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <span className="text-sm font-bold text-orange-600 uppercase tracking-widest">Dudas frecuentes</span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-2">
            ¿Y si no <span className="text-orange-600">sé de fútbol</span>?
          </h2>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {[
            {
              q: "¿Tengo que saber mucho de fútbol?",
              a: "¡Para nada! Mucha gente acierta más \"por intuición\" o por cariño a una bandera que los expertos. El Mundial siempre tiene sorpresas."
            },
            {
              q: "¿Y si fallo el primer partido? ¿Ya estoy fuera?",
              a: "¡No! Tienes muchísimos partidos por delante. Aunque falles 10 seguidos, puedes remontar. El ranking se actualiza cada vez que se juega un partido."
            },
            {
              q: "¿Puedo cambiar mis predicciones?",
              a: "Sí, cuando quieras... hasta el día del primer partido del Mundial. Después se bloquea tu porra y ya no se puede tocar (¡así nadie hace trampas!)."
            },
            {
              q: "¿Puedo hacer varias porras?",
              a: "¡Claro! Puedes hacer tantas porras como quieras (una para ti, otra para tu peña, una para los niños...). Cada una con sus predicciones distintas."
            },
            {
              q: "¿Cuándo sé si he ganado?",
              a: "Cuando termine la final del Mundial. Los 3 primeros del ranking se llevan los premios del bote común. Te avisamos por email."
            },
          ].map((faq, i) => (
            <Card key={i} className="border-2 border-slate-200 hover:border-orange-300 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{faq.q}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
              El <strong>{config?.comision_club_porcentaje || 10}%</strong> de cada entrada va para <strong>apoyar a los equipos del CD Bustarviejo</strong>. Juegas, te diviertes y ayudas al pueblo. 💚
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