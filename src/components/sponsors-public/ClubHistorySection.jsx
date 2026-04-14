import React from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Heart, Users } from "lucide-react";

// Imagen eliminada hasta tener foto real del club

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 }
};

export default function ClubHistorySection() {
  return (
    <section className="py-20 lg:py-28 bg-white" id="historia">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div {...fadeInUp} className="text-center mb-16">
          <span className="inline-block bg-orange-100 text-orange-700 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Nuestra Historia
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4">
            Más que un club,<br />
            <span className="text-orange-600">una familia</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fadeInUp} className="space-y-6">
            <p className="text-lg text-slate-700 leading-relaxed">
              El <strong>CD Bustarviejo</strong> nació del corazón de un pueblo de la Sierra Norte de Madrid.
              Desde hace décadas, nuestro club es el punto de encuentro donde generaciones de familias 
              han compartido la pasión por el deporte. Somos mucho más que fútbol: somos <strong>el latido 
              deportivo de todo un pueblo</strong>.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              En un entorno privilegiado rodeado de montañas, ofrecemos a los niños, niñas y jóvenes de la zona 
              un espacio seguro donde <strong>crecer, aprender valores y desarrollarse</strong> como personas 
              a través del deporte: fútbol, baloncesto, pádel y fútbol sala.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              Apostamos firmemente por la <strong>inclusión, la igualdad y el deporte femenino</strong>.
              Nuestro equipo femenino es una de nuestras mayores apuestas: creemos que cada niña y cada mujer
              merece las mismas oportunidades sobre el terreno de juego.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              Cada temporada, más de <strong>130 deportistas y sus familias</strong> forman parte del club 
              — desde los más pequeños de Pre-Benjamín hasta nuestro equipo Aficionado. Y seguimos creciendo.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { icon: MapPin, label: "Sierra Norte de Madrid", sub: "Entorno natural único" },
                { icon: Calendar, label: "Décadas de historia", sub: "Tradición y compromiso" },
                { icon: Heart, label: "Formación en valores", sub: "Respeto, esfuerzo, equipo" },
                { icon: Users, label: "+130 deportistas", sub: "De 4 a 40 años" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-green-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-orange-200 to-green-200 rounded-3xl blur-2xl opacity-40" />
            <div className="relative rounded-3xl shadow-2xl w-full aspect-[4/3] overflow-hidden">
              <img 
                src="https://media.base44.com/images/public/6992c6be619d2da592897991/eb2439635_fondo_optimizado.jpg" 
                alt="Fútbol femenino CD Bustarviejo" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p className="font-black text-2xl lg:text-3xl">+130 deportistas</p>
                <p className="text-sm opacity-90 mt-1">y sus familias, unidos por el deporte</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}