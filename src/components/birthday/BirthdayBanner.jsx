import React from "react";
import { Card, CardContent } from "@/components/ui/card";

function isBirthdayToday(fechaNac) {
  if (!fechaNac) return false;
  const today = new Date();
  const birth = new Date(fechaNac);
  return birth.getDate() === today.getDate() && birth.getMonth() === today.getMonth();
}

function calcBirthdayAge(fechaNac) {
  if (!fechaNac) return null;
  const today = new Date();
  const birth = new Date(fechaNac);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * BirthdayBanner - Muestra cumpleaños de HOY
 * @param {Object[]} players - Array de jugadores con nombre, fecha_nacimiento e id
 * @param {string[]} myPlayerIds - IDs de MIS jugadores (para diferenciar hijo vs compañero)
 * @param {"parent"|"coach"} mode - parent muestra banners diferenciados, coach muestra todos igual
 */
export default function BirthdayBanner({ players = [], myPlayerIds = [], mode = "parent" }) {
  if (!players || players.length === 0) return null;

  const todayBirthdays = players.filter(p => isBirthdayToday(p.fecha_nacimiento));

  if (todayBirthdays.length === 0) return null;

  // Separar MIS hijos de los compañeros
  const myKidsBirthdays = todayBirthdays.filter(p => myPlayerIds.includes(p.id));
  const teammateBirthdays = todayBirthdays.filter(p => !myPlayerIds.includes(p.id));

  return (
    <div className="space-y-3">
      {/* Banner especial para MIS HIJOS */}
      {myKidsBirthdays.map(player => (
        <Card key={player.id} className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-100 via-orange-100 to-pink-100 shadow-xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
                🎂
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-lg">
                  ¡Hoy cumple años <span className="text-orange-600">{player.nombre}</span>!
                </p>
                <p className="text-sm text-slate-700 font-medium">
                  🎉 Cumple {calcBirthdayAge(player.fecha_nacimiento)} años • ¡Felicidades! 🎈🥳
                </p>
              </div>
              <span className="text-4xl animate-bounce">🎁</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Banner para COMPAÑEROS - invita a felicitarles */}
      {teammateBirthdays.length > 0 && (
        <Card className="border border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-md overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                🎈
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-purple-900 text-sm">
                  {teammateBirthdays.length === 1 ? (
                    <>¡<span className="text-purple-600">{teammateBirthdays[0].nombre}</span> cumple {calcBirthdayAge(teammateBirthdays[0].fecha_nacimiento)} años hoy!</>
                  ) : (
                    <>¡Hoy hay {teammateBirthdays.length} cumpleaños en el equipo!</>
                  )}
                </p>
                <p className="text-xs text-purple-700">
                  {teammateBirthdays.length === 1 ? (
                    "Si lo ves, ¡dale una felicitación! 🎉"
                  ) : (
                    <>Felicita a: {teammateBirthdays.map(p => p.nombre.split(' ')[0]).join(', ')} 🎉</>
                  )}
                </p>
              </div>
              <span className="text-2xl">👏</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}