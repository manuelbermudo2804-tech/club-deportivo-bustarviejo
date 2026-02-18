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
  // Set birth to this year
  const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  const diffDays = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 7;
}

function calcAge(fechaNac) {
  if (!fechaNac) return null;
  const today = new Date();
  const birth = new Date(fechaNac);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calcNextAge(fechaNac) {
  return calcAge(fechaNac) + 1;
}

/**
 * BirthdayBanner
 * @param {Object[]} players - Array of player objects with nombre and fecha_nacimiento
 * @param {"parent"|"coach"} mode - parent shows "tu hijo cumple", coach shows player names
 */
export default function BirthdayBanner({ players = [], mode = "parent" }) {
  if (!players || players.length === 0) return null;

  const todayBirthdays = players.filter(p => isBirthdayToday(p.fecha_nacimiento));
  const weekBirthdays = players.filter(p => isBirthdayThisWeek(p.fecha_nacimiento));

  if (todayBirthdays.length === 0 && weekBirthdays.length === 0) return null;

  return (
    <div className="space-y-2">
      {todayBirthdays.map(player => (
        <Card key={player.id} className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50 shadow-lg overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                🎂
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm">
                  {mode === "parent" 
                    ? `¡Hoy es el cumple de ${player.nombre.split(' ')[0]}!` 
                    : `¡Hoy cumple años ${player.nombre}!`}
                </p>
                <p className="text-xs text-slate-600">
                  Cumple {calcNextAge(player.fecha_nacimiento)} años 🎉🎈
                </p>
              </div>
              <span className="text-3xl">🥳</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {weekBirthdays.length > 0 && (
        <Card className="border border-purple-200 bg-purple-50/50">
          <CardContent className="p-3">
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
                      🎂 <strong>{mode === "parent" ? player.nombre.split(' ')[0] : player.nombre}</strong> cumple {calcNextAge(player.fecha_nacimiento)} años
                    </span>
                    <span className="text-purple-600 font-medium capitalize">
                      {daysUntil === 1 ? "¡Mañana!" : `${dayName} (${daysUntil}d)`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}