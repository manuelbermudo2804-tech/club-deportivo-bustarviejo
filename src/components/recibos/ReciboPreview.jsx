import React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Convierte número a letras
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
    <div
      id="recibo-preview"
      className="bg-white shadow-2xl aspect-[1/1.414] w-full max-w-md mx-auto text-slate-900 relative overflow-hidden"
      style={{ fontFamily: "Georgia, serif" }}
    >
      {/* Borde decorativo doble */}
      <div className="absolute inset-3 border border-orange-300/60 pointer-events-none" />
      <div className="absolute inset-4 border-[3px] border-orange-600 pointer-events-none" />

      {/* Esquinas decorativas */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-[3px] border-l-[3px] border-orange-700 pointer-events-none" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-[3px] border-r-[3px] border-orange-700 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-[3px] border-l-[3px] border-orange-700 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-[3px] border-r-[3px] border-orange-700 pointer-events-none" />

      {/* Marca de agua */}
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 object-contain opacity-[0.04] pointer-events-none"
          crossOrigin="anonymous"
        />
      )}

      <div className="relative p-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Club"
                className="w-16 h-16 object-contain drop-shadow-sm"
                crossOrigin="anonymous"
              />
            )}
            <div>
              <h2 className="text-lg font-black leading-tight tracking-wide text-slate-900">CD BUSTARVIEJO</h2>
              <p className="text-[10px] text-slate-500 leading-tight italic">Club Deportivo<br />Bustarviejo · Madrid</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">Recibo Nº</p>
            <p className="text-2xl font-black text-orange-600 leading-none mt-1">{numero || "—"}</p>
            {fechaFmt && (
              <p className="text-[9px] text-slate-500 mt-1 italic">{fechaFmt}</p>
            )}
          </div>
        </div>

        {/* Separador ornamental */}
        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-orange-600" />
          <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-orange-400 to-orange-600" />
        </div>

        {/* Título */}
        <div className="text-center mb-5">
          <h1 className="text-3xl font-black tracking-[0.3em] text-slate-800">RECIBÍ</h1>
          <div className="w-12 h-0.5 bg-orange-600 mx-auto mt-1" />
        </div>

        {/* Cuerpo */}
        <div className="space-y-3.5 text-[13px] leading-relaxed flex-1">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Recibí de</p>
            <p className="font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
              {recibiDe || "________________________________"}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">La cantidad de</p>
            <div className="flex items-baseline gap-2 border-b border-dotted border-slate-400 pb-0.5">
              <p className="font-black text-2xl text-orange-700">{cantidad ? `${cantidad}` : "________"}</p>
              <p className="font-bold text-lg text-slate-700">€</p>
            </div>
            {cantidad && (
              <p className="text-[10px] italic text-slate-500 mt-1">({numeroALetras(cantidad)})</p>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">En concepto de</p>
            <p className="font-semibold text-slate-800 border-b border-dotted border-slate-400 pb-0.5">
              {concepto || "________________________________"}
              {temporada && <span className="text-orange-700"> · Temporada {temporada}</span>}
            </p>
          </div>
        </div>

        {/* Footer: lugar, fecha, firma y sello */}
        <div className="mt-auto pt-4">
          <p className="text-[11px] text-slate-600 italic mb-6">
            En <span className="font-semibold text-slate-800 not-italic">{lugar || "________"}</span>, a <span className="font-semibold text-slate-800 not-italic">{fechaFmt || "____ de __________ de ______"}</span>
          </p>

          <div className="flex items-end justify-between gap-4">
            <div className="text-center relative flex-shrink-0">
              {firmaUrl && (
                <img
                  src={firmaUrl}
                  alt="firma"
                  className="absolute -top-12 left-1/2 -translate-x-1/2 h-16 object-contain"
                  crossOrigin="anonymous"
                />
              )}
              <div className="w-48 border-t-2 border-slate-700 pt-1.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-orange-700 font-bold">El Presidente</p>
                <p className="text-[11px] font-bold text-slate-900 mt-0.5">Manuel Bermudo Santacruz</p>
                <p className="text-[9px] text-slate-500 italic">DNI: 51404895X</p>
              </div>
            </div>
            {selloUrl && (
              <img
                src={selloUrl}
                alt="sello"
                className="w-28 h-28 object-contain opacity-90 -rotate-6"
                crossOrigin="anonymous"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}