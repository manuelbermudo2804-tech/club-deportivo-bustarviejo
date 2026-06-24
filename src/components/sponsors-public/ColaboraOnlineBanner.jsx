import React from "react";
import { Heart, CreditCard } from "lucide-react";

export default function ColaboraOnlineBanner() {
  return (
    <section className="py-12 px-4 bg-gradient-to-br from-orange-600 via-orange-500 to-green-600">
      <div className="max-w-2xl mx-auto text-center text-white">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
          <Heart className="w-7 h-7" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-black mb-3">¿Prefieres colaborar ya mismo?</h2>
        <p className="text-white/90 mb-6 text-lg">
          Elige tu aportación, sube tu logo y paga con tarjeta en 1 minuto. Tu banner se activará
          en la app y la web del club tras una rápida revisión.
        </p>
        <a
          href="/Colabora"
          className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-8 py-4 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all text-lg"
        >
          <CreditCard className="w-5 h-5" />
          Colaborar online ahora
        </a>
      </div>
    </section>
  );
}