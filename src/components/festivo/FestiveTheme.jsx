import React from "react";
import useTemaFestivo from "@/hooks/useTemaFestivo";
import FestiveBanner from "./FestiveBanner";
import FestiveParticles from "./FestiveParticles";
import FestiveScenes from "./scenes/FestiveScenes";

// Decoración festiva de la app. Solo aparece cuando un administrador la activa.
export default function FestiveTheme() {
  const { clave, tema, mensaje, particulas } = useTemaFestivo();
  if (!tema) return null;
  return (
    <>
      {particulas && <FestiveParticles tema={tema} />}
      {particulas && <FestiveScenes clave={clave} />}
      <FestiveBanner clave={clave} tema={tema} mensaje={mensaje} />
    </>
  );
}