import React from "react";
import useTemaFestivo from "@/hooks/useTemaFestivo";
import FestiveBanner from "./FestiveBanner";
import FestiveParticles from "./FestiveParticles";
import FestiveScenes from "./scenes/FestiveScenes";
import Halloween from "@/pages/Halloween";
import { useState } from "react";

// Decoración festiva de la app. Solo aparece cuando un administrador la activa.
export default function FestiveTheme() {
  const { clave, tema, mensaje, particulas, prueba } = useTemaFestivo();
  const [halloweenOpen, setHalloweenOpen] = useState(true);
  if (!tema) return null;
  return (
    <>
      {particulas && <FestiveParticles tema={tema} />}
      {particulas && <FestiveScenes clave={clave} />}
      <FestiveBanner key={`${clave}-${prueba}`} clave={clave} tema={tema} mensaje={mensaje} prueba={prueba} />
      {clave === "halloween" && halloweenOpen && <Halloween onClose={() => setHalloweenOpen(false)} />}
    </>
  );
}