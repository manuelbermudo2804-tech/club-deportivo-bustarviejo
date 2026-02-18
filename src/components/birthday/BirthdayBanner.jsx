import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cake } from "lucide-react";

function isBirthdayToday(fechaNac) {
  if (!fechaNac) return false;
  const today = new Date();
  const birth = new Date(fechaNac);
  return birth.getDate() === today.getDate() && birth.getMonth() === today.getMonth();
}

function isBirthdayThisWeek(fechaNac) {
  if (!fechaNac) return false;
  const today = new Date();
  const birth = new Date(fechaNac);
  const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  const diffDays = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 7;
}

function calcBirthdayAge(fechaNac) {
  if (!fechaNac) return null;
  const today = new Date();
  const birth = new Date(fechaNac);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  // Si es hoy, ya cumplió → mostrar la edad actual (ya incrementada)
  if (isBirthdayToday(fechaNac)) return age;
  // Si es esta semana, mostrar la edad que cumplirá
  return age + 1;
}

/**
 * BirthdayBanner - Muestra UN SOLO banner con todos los cumpleaños
 * @param {Object[]} players - Array de jugadores con nombre y fecha_nacimiento
 * @param {"parent"|"coach"} mode - parent muestra nombre corto, coach nombre completo
 */
export default function BirthdayBanner({ players = [], mode = "parent" }) {
  if (!players || players.length === 0) return null;

  const todayBirthdays = players.filter(p => isBirthdayToday(p.fecha_nacimiento));
  const weekBirthdays = players.filter(p => isBirthdayThisWeek(p.fecha_nacimiento));

  if (todayBirthdays.length === 0 && weekBirthdays.length === 0) return null;

  const getName = (player) => mode === "parent" ? player.nombre.split(' ')[0] : player.nombre;

  return (
    <Card className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50 shadow-lg overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Cumpleaños de hoy */}
        {todayBirthdays.map(player => (
          <div key={player.id} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center text-xl flex-shrink-0">
              🎂
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">
                ¡Hoy cumple años <span className="text-orange-600">{getName(player)}</span>!
              </p>
              <p className="text-xs text-slate-600">
                Cumple {calcBirthdayAge(player.fecha_nacimiento)} años 🎉🎈
              </p>
            </div>
            <span className="text-3xl">🥳</span>
          </div>
        ))}

        {/* Separador si hay ambos */}
        {todayBirthdays.length > 0 && weekBirthdays.length > 0 && (
          <div className="border-t border-yellow-200" />
        )}

        {/* Próximos esta semana */}
        {weekBirthdays.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cake className="w-4 h-4 text-purple-500" />
              <p className="font-semibold text-purple-900 text-xs">
                Próximos cumpleaños esta semana
              </p>
            </div>
            <div className="space-y-1">
              {weekBirthdays.map(player => {
                const birth = new Date(player.fecha_nacimiento);
                const today = new Date();
                const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
                const daysUntil = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24));
                const dayName = thisYearBday.toLocaleDateString('es-ES', { weekday: 'long' });

                return (
                  <div key={player.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">
                      🎂 <strong>{getName(player)}</strong> cumple {calcBirthdayAge(player.fecha_nacimiento)} años
                    </span>
                    <span className="text-purple-600 font-medium capitalize">
                      {daysUntil === 1 ? "¡Mañana!" : `${dayName} (${daysUntil}d)`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}