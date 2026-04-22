import React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Convierte número a letras (simple, suficiente para importes típicos)
const numeroALetras = (num) => {
  const n = parseFloat(String(num).replace(",", "."));
  if (isNaN(n)) return "";
  const entero = Math.floor(n);
  const decimal = Math.round((n - entero) * 100);
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte"];
  const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  const convertir = (num) => {
    if (num === 0) return "cero";
    if (num === 100) return "cien";
    if (num <= 20) return unidades[num];
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      if (num < 30) return "veinti" + unidades[u];
      return decenas[d] + (u ? " y " + unidades[u] : "");
    }
    if (num < 1000) {
      const c = Math.floor(num / 100);
      const resto = num % 100;
      return centenas[c] + (resto ? " " + convertir(resto) : "");
    }
    if (num < 1000000) {
      const miles = Math.floor(num / 1000);
      const resto = num % 1000;
      const milesTxt = miles === 1 ? "mil" : convertir(miles) + " mil";
      return milesTxt + (resto ? " " + convertir(resto) : "");
    }
    return String(num);
  };

  let result = convertir(entero) + " euros";
  if (decimal > 0) result += " con " + convertir(decimal) + " céntimos";
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export default function ReciboPreview({ numero, fecha, recibiDe, cantidad, concepto, temporada, lugar, logoUrl, selloUrl, firmaUrl }) {
  let fechaFmt = "";
  try {
    if (fecha) fechaFmt = format(parseISO(fecha), "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch {}

  return (
    <div id="recibo-preview" className="bg-white shadow-md border-2 border-slate-200 p-8 aspect-[1/1.414] w-full max-w-md mx-auto text-slate-900 relative" style={{ fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-orange-600 pb-4 mb-6">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="Club" className="w-16 h-16 object-contain" crossOrigin="anonymous" />}
          <div>
            <h2 className="text-lg font-black leading-tight">CD BUSTARVIEJO</h2>
            <p className="text-[10px] text-slate-500 leading-tight">Club Deportivo<br/>Bustarviejo, Madrid</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Recibo Nº</p>
          <p className="text-xl font-black text-orange-600">{numero || "—"}</p>
        </div>
      </div>

      {/* Título */}
      <h1 className="text-center text-2xl font-black tracking-wide mb-6 text-slate-800">RECIBÍ</h1>

      {/* Cuerpo */}
      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          <span className="text-slate-500">Recibí de</span>{" "}
          <span className="font-bold border-b border-slate-300 px-1">{recibiDe || "________________________________"}</span>
        </p>

        <p>
          <span className="text-slate-500">la cantidad de</span>{" "}
          <span className="font-bold text-lg">{cantidad ? `${cantidad} €` : "________ €"}</span>
        </p>

        {cantidad && (
          <p className="text-xs italic text-slate-600">({numeroALetras(cantidad)})</p>
        )}

        <p>
          <span className="text-slate-500">en concepto de</span>{" "}
          <span className="font-semibold">{concepto || "________________________________"}</span>
          {temporada && <span className="font-semibold"> — Temporada {temporada}</span>}
          <span>.</span>
        </p>
      </div>

      {/* Footer: lugar, fecha, firma y sello */}
      <div className="absolute bottom-8 left-8 right-8">
        <p className="text-sm mb-8">
          En <span className="font-semibold">{lugar || "________"}</span>, a <span className="font-semibold">{fechaFmt || "____ de __________ de ______"}</span>
        </p>

        <div className="flex items-end justify-between">
          <div className="text-center relative">
            {firmaUrl && (
              <img src={firmaUrl} alt="firma" className="absolute -top-10 left-1/2 -translate-x-1/2 h-14 object-contain" crossOrigin="anonymous" />
            )}
            <div className="w-40 border-t border-slate-400 pt-1">
              <p className="text-[10px] text-slate-500">Firma y sello del club</p>
            </div>
          </div>
          {selloUrl && (
            <img src={selloUrl} alt="sello" className="w-28 h-28 object-contain opacity-90 -rotate-6" crossOrigin="anonymous" />
          )}
        </div>
      </div>
    </div>
  );
}