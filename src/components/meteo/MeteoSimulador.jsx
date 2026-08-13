import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { evaluarMeteo, getGrupoCategoria, NIVEL_STYLES } from "@/lib/meteoRules";
import MeteoEntrenoCard from "./MeteoEntrenoCard";
import MeteoFamiliaPreview from "./MeteoFamiliaPreview";

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Alevín Femenino",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
];

function Slider({ label, value, min, max, unit, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-orange-600"
      />
    </div>
  );
}

export default function MeteoSimulador({ config }) {
  const [viento, setViento] = useState(32);
  const [rachas, setRachas] = useState(48);
  const [lluvia, setLluvia] = useState(70);
  const [temperatura, setTemperatura] = useState(8);
  const [categoria, setCategoria] = useState(CATEGORIAS[1]);
  const [vista, setVista] = useState("entrenador");

  const meteo = { viento, rachas, lluvia, temperatura };
  const grupo = getGrupoCategoria(categoria);
  const evaluacion = evaluarMeteo(meteo, grupo, config);
  const s = NIVEL_STYLES[evaluacion.nivel];

  const item = {
    categoria,
    hora_inicio: "18:00",
    hora_fin: "19:30",
    ubicacion: "Campo Municipal",
    meteo,
    ...evaluacion,
    decision: null,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="font-bold text-slate-900">🧪 Modo prueba</p>
          <p className="text-sm text-slate-500">Mueve los valores y mira cómo reacciona el sistema. No se guarda nada ni se avisa a nadie.</p>

          <Slider label="Viento" value={viento} min={0} max={80} unit="km/h" onChange={setViento} />
          <Slider label="Rachas" value={rachas} min={0} max={110} unit="km/h" onChange={setRachas} />
          <Slider label="Lluvia" value={lluvia} min={0} max={100} unit="%" onChange={setLluvia} />
          <Slider label="Temperatura" value={temperatura} min={-5} max={35} unit="°" onChange={setTemperatura} />

          <div>
            <Label>Categoría</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className={`rounded-xl border p-3 ${s.card}`}>
            <p className={`font-bold ${s.text}`}>{s.emoji} {evaluacion.recomendacion}</p>
            <ul className="text-sm text-slate-600 list-disc list-inside mt-1">
              {evaluacion.motivos.length ? evaluacion.motivos.map((m, i) => <li key={i}>{m}</li>) : <li>Condiciones dentro de los límites</li>}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setVista("entrenador")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${vista === "entrenador" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
            >Ver como entrenador</button>
            <button
              onClick={() => setVista("familia")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${vista === "familia" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
            >Ver como familia</button>
          </div>

          {vista === "entrenador"
            ? <MeteoEntrenoCard item={item} readOnly onDecidir={() => {}} />
            : <MeteoFamiliaPreview item={item} horaLimite={config?.hora_limite_aviso || "16:30"} />}
        </CardContent>
      </Card>
    </div>
  );
}