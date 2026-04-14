import React from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Heart, Users } from "lucide-react";

const KIDS_IMG = "https://media.base44.com/images/public/6992c6be619d2da592897991/40b4a0ca7_generated_image.png";

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
              han compartido la pasión por el deporte.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              En un entorno privilegiado rodeado de montañas, ofrecemos a los niños y jóvenes de la zona 
              un espacio seguro donde <strong>crecer, aprender valores y desarrollarse</strong> como personas 
              a través del fútbol y el baloncesto.
            </p>
            <p className="text-lg text-slate-700 leading-relaxed">
              Cada temporada, más de <strong>200 deportistas</strong> de todas las edades visten nuestra camiseta 
              con orgullo — desde los más pequeños de Pre-Benjamín hasta nuestro equipo Aficionado.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { icon: MapPin, label: "Sierra Norte de Madrid", sub: "Entorno natural único" },
                { icon: Calendar, label: "Décadas de historia", sub: "Tradición y compromiso" },
                { icon: Heart, label: "Formación en valores", sub: "Respeto, esfuerzo, equipo" },
                { icon: Users, label: "+200 deportistas", sub: "De 4 a 40 años" },
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
            <img
              src={KIDS_IMG}
              alt="Jugadores del CD Bustarviejo celebrando"
              className="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
            />
            <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-orange-600 to-green-600 text-white rounded-2xl px-5 py-3 shadow-xl">
              <p className="font-black text-2xl">+200</p>
              <p className="text-xs opacity-90">jóvenes deportistas</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}