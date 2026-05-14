import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import PropuestaHero from "@/components/propuesta/PropuestaHero";
import PropuestaImpacto from "@/components/propuesta/PropuestaImpacto";
import PropuestaFemenino from "@/components/propuesta/PropuestaFemenino";
import PropuestaPaquetes from "@/components/propuesta/PropuestaPaquetes";
import PropuestaResumenForm from "@/components/propuesta/PropuestaResumenForm";
import PropuestaFooter from "@/components/propuesta/PropuestaFooter";
import usePublicPageTracker from "@/components/public/usePublicPageTracker";

const GVC_LOGO_DEFAULT = "https://media.base44.com/images/public/6992c6be619d2da592897991/8e8967490_logo_hori_rgb.gif";

// Componente reutilizable para cualquier propuesta. Lee params de URL:
//   ?empresa=NombreEmpresa&logo=URL_LOGO&color=orange|blue|green|purple|rose|slate
// Si no hay params, se renderiza la propuesta para GVC Gaesco (la original).
export default function PropuestaGVCGaesco() {
  const [seleccionados, setSeleccionados] = useState([]);
  const location = useLocation();

  const { empresa, logoEmpresa, origen } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const empresaParam = params.get("empresa")?.trim();
    const logoParam = params.get("logo")?.trim();
    return {
      empresa: empresaParam || "GVC Gaesco",
      logoEmpresa: logoParam || GVC_LOGO_DEFAULT,
      origen: (empresaParam || "gvcgaesco").toLowerCase().replace(/\s+/g, "-"),
    };
  }, [location.search]);

  // Tracking de visitas — usa el slug de empresa para diferenciar propuestas
  usePublicPageTracker(`Propuesta_${origen}`);

  useEffect(() => {
    document.title = `Propuesta de Patrocinio · ${empresa} × CD Bustarviejo`;
  }, [empresa]);

  const toggle = (paquete) => {
    setSeleccionados((prev) =>
      prev.some((p) => p.id === paquete.id)
        ? prev.filter((p) => p.id !== paquete.id)
        : [...prev, paquete]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <PropuestaHero empresa={empresa} logoEmpresa={logoEmpresa} />
      <PropuestaImpacto />
      <PropuestaFemenino empresa={empresa} />
      <PropuestaPaquetes seleccionados={seleccionados} onToggle={toggle} />
      <PropuestaResumenForm seleccionados={seleccionados} empresa={empresa} origen={origen} />
      <PropuestaFooter empresa={empresa} />
    </div>
  );
}