import React, { useState, useEffect } from "react";
import PropuestaHero from "@/components/propuesta/PropuestaHero";
import PropuestaImpacto from "@/components/propuesta/PropuestaImpacto";
import PropuestaFemenino from "@/components/propuesta/PropuestaFemenino";
import PropuestaPaquetes from "@/components/propuesta/PropuestaPaquetes";
import PropuestaResumenForm from "@/components/propuesta/PropuestaResumenForm";

export default function PropuestaGVCGaesco() {
  const [seleccionados, setSeleccionados] = useState([]);

  useEffect(() => {
    document.title = "Propuesta de Patrocinio · GVC Gaesco × CD Bustarviejo";
  }, []);

  const toggle = (paquete) => {
    setSeleccionados((prev) =>
      prev.some((p) => p.id === paquete.id)
        ? prev.filter((p) => p.id !== paquete.id)
        : [...prev, paquete]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <PropuestaHero />
      <PropuestaImpacto />
      <PropuestaFemenino />
      <PropuestaPaquetes seleccionados={seleccionados} onToggle={toggle} />
      <PropuestaResumenForm seleccionados={seleccionados} empresa="GVC Gaesco" origen="gvcgaesco" />
      <footer className="bg-slate-900 text-white/50 py-6 text-center text-xs">
        © CD Bustarviejo · Propuesta confidencial preparada para GVC Gaesco · Temporada 2026/27
      </footer>
    </div>
  );
}