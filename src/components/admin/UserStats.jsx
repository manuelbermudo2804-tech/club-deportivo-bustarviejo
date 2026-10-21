import React from "react";

export default function UserStats({
  activeUsers,
  admins,
  jugadores,
  menores,
  entrenadores,
  coordinadores,
  tesoreros,
  restrictedUsers,
  deletedUsers,
  usersWithApp,
  usersWithoutApp,
}) {
  const stats = [
    { value: activeUsers.length, label: "Padres", color: "green" },
    { value: admins.length, label: "Admins", color: "orange" },
    { value: jugadores.length, label: "Jugad.+18", color: "purple" },
    { value: menores.length, label: "Juveniles", color: "teal" },
    { value: entrenadores.length, label: "Entren.", color: "blue" },
    { value: coordinadores.length, label: "Coord.", color: "cyan" },
    { value: tesoreros.length, label: "Tesor.", color: "emerald" },
    { value: restrictedUsers.length, label: "Restrin.", color: "red" },
    { value: deletedUsers.length, label: "Elimin.", color: "slate" },
    { value: usersWithApp.length, label: "📲 App", color: "green" },
    { value: usersWithoutApp.length, label: "📵 Sin", color: "amber" },
  ];

  const colorMap = {
    green: "border-green-500 text-green-600",
    orange: "border-orange-500 text-orange-600",
    purple: "border-purple-500 text-purple-600",
    teal: "border-teal-500 text-teal-600",
    blue: "border-blue-500 text-blue-600",
    cyan: "border-cyan-500 text-cyan-600",
    emerald: "border-emerald-500 text-emerald-600",
    red: "border-red-500 text-red-600",
    slate: "border-slate-400 text-slate-600",
    amber: "border-amber-400 text-amber-600",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-11">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`group min-w-0 rounded-xl border border-slate-200 border-l-4 bg-white px-3 py-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${colorMap[s.color].split(" ")[0]}`}
        >
          <p className={`text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl ${colorMap[s.color].split(" ")[1]}`}>{s.value}</p>
          <p className="mt-1 text-xs font-semibold leading-tight text-slate-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}