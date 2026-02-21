import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, PartyPopper, ArrowRight, UserCircle } from "lucide-react";
import { calcularEdad, sugerirCategoriaPorEdad } from "../utils/ageCalculator";

/**
 * Detects players turning 18 before next season (July 1st) and category changes.
 * Shows relevant banners for parents or minors.
 */

function getNextSeasonStartDate() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, 6, 1); // July 1st
}

function getAgeOnDate(fechaNacimiento, targetDate) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  let edad = targetDate.getFullYear() - nacimiento.getFullYear();
  const m = targetDate.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

export function getPlayerTransitions(players) {
  const nextSeasonStart = getNextSeasonStartDate();
  const transitions = [];

  for (const player of players) {
    if (!player.fecha_nacimiento || !player.activo) continue;

    const edadActual = calcularEdad(player.fecha_nacimiento);
    const edadProximaTemporada = getAgeOnDate(player.fecha_nacimiento, nextSeasonStart);

    if (edadActual === null || edadProximaTemporada === null) continue;

    // Turning 18 before next season
    if (edadActual < 18 && edadProximaTemporada >= 18) {
      transitions.push({
        type: "turning_18",
        player,
        edadActual,
        edadProximaTemporada,
      });
    }

    // Category change (not turning 18)
    if (edadProximaTemporada < 18) {
      const categoriaActual = player.categoria_principal || player.deporte;
      const categoriaSugerida = sugerirCategoriaPorEdad(edadProximaTemporada);
      if (categoriaSugerida && categoriaActual && categoriaSugerida !== categoriaActual
          && !categoriaActual.includes("Femenino") && !categoriaActual.includes("Baloncesto")) {
        transitions.push({
          type: "category_change",
          player,
          categoriaActual,
          categoriaNueva: categoriaSugerida,
          edadProximaTemporada,
        });
      }
    }
  }

  return transitions;
}

export function ParentAgeTransitionBanner({ players }) {
  const transitions = getPlayerTransitions(players);
  if (transitions.length === 0) return null;

  const turning18 = transitions.filter(t => t.type === "turning_18");
  const categoryChanges = transitions.filter(t => t.type === "category_change");

  return (
    <div className="space-y-3">
      {turning18.map(t => (
        <Card key={`18-${t.player.id}`} className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                <PartyPopper className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-amber-900 text-sm">
                    🎂 {t.player.nombre?.split(" ")[0]} cumplirá 18 años
                  </p>
                  <Badge className="bg-amber-600 text-white text-[10px]">IMPORTANTE</Badge>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  De cara a la <strong>próxima temporada</strong>, {t.player.nombre?.split(" ")[0]} deberá inscribirse 
                  por su cuenta como <strong>jugador mayor de edad</strong>. Tú no podrás renovar su plaza.
                </p>
                <div className="mt-2 bg-amber-100 rounded-lg p-2 border border-amber-200">
                  <p className="text-[11px] text-amber-700">
                    <strong>¿Qué significa?</strong> En la próxima temporada, {t.player.nombre?.split(" ")[0]} recibirá 
                    una invitación a su propio email para inscribirse como jugador +18. 
                    Los pagos de esta temporada no cambian.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {categoryChanges.map(t => (
        <Card key={`cat-${t.player.id}`} className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-blue-900 text-sm mb-1">
                  📋 {t.player.nombre?.split(" ")[0]} cambiará de categoría
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs border-slate-300">{t.categoriaActual}</Badge>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <Badge className="bg-blue-600 text-white text-xs">{t.categoriaNueva}</Badge>
                </div>
                <p className="text-xs text-blue-700 mt-1.5">
                  Al renovar la próxima temporada, pasará automáticamente a la nueva categoría.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MinorAgeTransitionBanner({ player }) {
  if (!player?.fecha_nacimiento) return null;

  const edadActual = calcularEdad(player.fecha_nacimiento);
  const nextSeasonStart = getNextSeasonStartDate();
  const edadProximaTemporada = getAgeOnDate(player.fecha_nacimiento, nextSeasonStart);

  if (edadActual === null || edadProximaTemporada === null) return null;
  if (edadActual >= 18 || edadProximaTemporada < 18) return null;

  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-amber-900 text-sm">
                🎂 ¡Pronto cumples 18!
              </p>
              <Badge className="bg-amber-600 text-white text-[10px]">INFO</Badge>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              La próxima temporada podrás inscribirte <strong>por tu cuenta</strong> como jugador mayor de edad. 
              Recibirás una invitación a tu email para gestionar tu propia ficha, pagos y más.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-amber-600" />
              <span className="text-[11px] text-amber-700 font-medium">
                Esta temporada no cambia nada, sigue todo como hasta ahora.
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}