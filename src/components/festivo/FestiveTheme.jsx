import React from "react";
import useTemaFestivo from "@/hooks/useTemaFestivo";
import FestiveBanner from "./FestiveBanner";
import FestiveParticles from "./FestiveParticles";

// Decoración festiva de la app. Solo aparece cuando un administrador la activa.
export default function FestiveTheme() {
  const { clave, tema, mensaje, particulas } = useTemaFestivo();
  if (!tema) return null;
  return (
    <>
      {particulas && <FestiveParticles tema={tema} />}
      <FestiveBanner clave={clave} tema={tema} mensaje={mensaje} />
    </>
  );
}