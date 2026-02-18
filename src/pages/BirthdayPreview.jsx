import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import BirthdayBanner from "../components/birthday/BirthdayBanner";

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const in3days = new Date(today);
in3days.setDate(in3days.getDate() + 3);

// Jugadores simulados con cumple hoy y esta semana
const fakePlayers = [
  {
    id: "fake-1",
    nombre: "Pablo García López",
    fecha_nacimiento: `2015-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  },
  {
    id: "fake-2",
    nombre: "Lucía Martínez Ruiz",
    fecha_nacimiento: `2013-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`,
  },
  {
    id: "fake-3",
    nombre: "Carlos Sánchez",
    fecha_nacimiento: `2014-${String(in3days.getMonth() + 1).padStart(2, '0')}-${String(in3days.getDate()).padStart(2, '0')}`,
  },
];

export default function BirthdayPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black p-4 lg:p-8 space-y-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🎂 Preview Cumpleaños</h1>
          <p className="text-slate-400 text-sm">Así ven los banners los padres y entrenadores</p>
        </div>

        {/* Vista Padre */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-orange-400">👨‍👩‍👧 Vista Padre / Familia</h2>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-slate-500 mb-2">Los padres ven el nombre corto de su hijo:</p>
              <BirthdayBanner players={fakePlayers} mode="parent" />
            </CardContent>
          </Card>
        </div>

        {/* Vista Entrenador */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-blue-400">🏃 Vista Entrenador</h2>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-slate-500 mb-2">El entrenador ve el nombre completo del jugador:</p>
              <BirthdayBanner players={fakePlayers} mode="coach" />
            </CardContent>
          </Card>
        </div>

        {/* Sin cumpleaños */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-400">🚫 Sin cumpleaños</h2>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-2">Si nadie cumple, no se muestra nada:</p>
              <BirthdayBanner players={[{ id: "x", nombre: "Test", fecha_nacimiento: "2015-01-01" }]} mode="parent" />
              <p className="text-xs text-slate-400 italic mt-2">(vacío — correcto ✅)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}