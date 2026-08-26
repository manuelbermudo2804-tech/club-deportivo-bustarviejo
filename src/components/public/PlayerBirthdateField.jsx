import React from "react";
import { Cake } from "lucide-react";

export function calcularEdad(fecha) {
  if (!fecha) return null;
  const nac = new Date(fecha);
  if (isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export default function PlayerBirthdateField({ value, onChange }) {
  const edad = calcularEdad(value);
  const esMayor = edad !== null && edad >= 18;

  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1">
        Fecha de nacimiento del jugador/a *
      </label>
      <div className="relative">
        <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          required
        />
      </div>
      {edad !== null && edad >= 0 && edad < 100 ? (
        <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-semibold border ${esMayor ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
          Edad: <strong>{edad} años</strong>
          {esMayor && <span className="block font-normal mt-0.5">Es jugador/a mayor de 18 años: tendrá su propio acceso independiente.</span>}
        </div>
      ) : (
        <p className="text-xs text-slate-500 mt-1">Nos sirve para saber si es menor o mayor de 18 años.</p>
      )}
    </div>
  );
}