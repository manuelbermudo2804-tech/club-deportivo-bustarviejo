import React from "react";
import { motion } from "framer-motion";
import { Check, Package, Shirt, Smartphone, Sparkles } from "lucide-react";

const PAQUETES = [
  {
    id: "vestuario_femenino",
    icon: Package,
    titulo: "Pack Vestuario Femenino",
    subtitulo: "El más visible y emocional",
    precio: 3000,
    precioLabel: "3.000 € / temporada",
    detallePrecio: "Aprox. 30 jugadoras × 100 €",
    color: "from-rose-500 to-pink-600",
    bgColor: "from-rose-50 to-pink-50",
    borderColor: "border-rose-300",
    destacado: true,
    incluye: [
      "Abrigo oficial con logo GVC Gaesco bordado",
      "Chubasquero con logo GVC Gaesco",
      "Mochila con logo GVC Gaesco serigrafiado",
      "Para todas las jugadoras del equipo femenino",
      "Reportaje fotográfico de entrega oficial",
      "Difusión en redes y app del club",
    ],
  },
  {
    id: "publicidad_camisetas",
    icon: Shirt,
    titulo: "Publicidad en Camisetas",
    subtitulo: "Visibilidad en todos los partidos",
    precio: 500,
    precioLabel: "500 € / temporada",
    detallePrecio: "Espacio publicitario · todos los equipos",
    color: "from-orange-500 to-amber-600",
    bgColor: "from-orange-50 to-amber-50",
    borderColor: "border-orange-300",
    destacado: false,
    incluye: [
      "Logo en camiseta oficial de juego",
      "Presencia en todas las categorías del club",
      "Visibilidad en cada partido y fotos oficiales",
      "Aparición en convocatorias y crónicas",
    ],
  },
  {
    id: "partner_digital",
    icon: Smartphone,
    titulo: "Partner Digital",
    subtitulo: "Presencia 360º en lo digital",
    precio: 1500,
    precioLabel: "1.500 € / temporada",
    detallePrecio: "App + web + redes + newsletter",
    color: "from-cyan-600 to-blue-600",
    bgColor: "from-cyan-50 to-blue-50",
    borderColor: "border-cyan-300",
    destacado: false,
    incluye: [
      "Logo en cabecera de la app del club",
      "Banners en la web y zona pública",
      "Menciones en newsletters mensuales",
      "Posts en redes sociales del club",
      "Logo en pantallas durante eventos",
    ],
  },
];

export default function PropuestaPaquetes({ seleccionados, onToggle }) {
  return (
    <section id="paquetes" className="bg-slate-50 py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-4">
          <div className="inline-block text-xs font-bold tracking-widest uppercase text-orange-600 mb-3">
            Configura tu propuesta
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">
            Elige los paquetes que mejor encajen
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Son <strong>totalmente combinables</strong>. Marca los que te interesen y verás el total en vivo. Podéis quedaros con uno, dos o los tres — lo importante es construir algo a la medida de GVC Gaesco.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-md mt-2 mb-10 mx-auto" style={{ display: 'flex', width: 'fit-content' }}>
          <Sparkles className="w-3.5 h-3.5" />
          Pack Vestuario + Camisetas = presencia 360° en el club
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {PAQUETES.map((paq, i) => {
            const Icon = paq.icon;
            const isSelected = seleccionados.some((s) => s.id === paq.id);
            return (
              <motion.button
                key={paq.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                onClick={() => onToggle(paq)}
                className={`relative text-left bg-gradient-to-br ${paq.bgColor} rounded-3xl p-6 lg:p-7 border-2 transition-all ${
                  isSelected
                    ? `${paq.borderColor} shadow-2xl scale-[1.02] ring-4 ring-offset-2 ring-${paq.color.split('-')[1]}-200`
                    : 'border-transparent hover:border-slate-200 hover:shadow-lg'
                }`}
              >
                {paq.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-black tracking-widest uppercase shadow-md">
                    ⭐ El que os enamoró
                  </div>
                )}

                <div className={`absolute top-4 right-4 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? `bg-gradient-to-br ${paq.color} border-transparent` : 'bg-white border-slate-300'
                }`}>
                  {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </div>

                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${paq.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1">{paq.titulo}</h3>
                <p className="text-xs text-slate-500 font-semibold mb-4">{paq.subtitulo}</p>

                <div className="mb-5 pb-5 border-b border-slate-200">
                  <div className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${paq.color}`}>
                    {paq.precioLabel}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{paq.detallePrecio}</div>
                </div>

                <ul className="space-y-2">
                  {paq.incluye.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className={`mt-5 text-center text-xs font-bold tracking-widest uppercase ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                  {isSelected ? '✓ Seleccionado' : 'Pulsa para añadir'}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { PAQUETES };