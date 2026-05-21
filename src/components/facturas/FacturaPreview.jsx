import React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { calcTotals, fmtMoney } from "./facturaPdfGenerator";

export default function FacturaPreview({
  numero,
  fecha,
  fechaVencimiento,
  emisorNombre,
  emisorCif,
  emisorDireccion,
  emisorCp,
  emisorEmail,
  emisorTelefono,
  clienteNombre,
  clienteCif,
  clienteDireccion,
  clienteCp,
  clienteEmail,
  lineas,
  ivaPct,
  formaPago,
  iban,
  observaciones,
  logoUrl,
  selloUrl,
  firmaUrl,
}) {
  let fechaFmt = "";
  let fechaVencFmt = "";
  try { if (fecha) fechaFmt = format(parseISO(fecha), "dd/MM/yyyy", { locale: es }); } catch {}
  try { if (fechaVencimiento) fechaVencFmt = format(parseISO(fechaVencimiento), "dd/MM/yyyy", { locale: es }); } catch {}

  const items = (lineas && lineas.length > 0) ? lineas : [{ descripcion: "", cantidad: 1, precio: 0 }];
  const totals = calcTotals(items, ivaPct);

  return (
    <div
      id="factura-preview"
      className="bg-white shadow-2xl aspect-[1/1.414] w-full max-w-md mx-auto text-slate-900 relative overflow-hidden"
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      {/* Bandas decorativas */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-600" />
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-orange-600" />

      {/* Marca de agua */}
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 object-contain opacity-[0.04] pointer-events-none"
          crossOrigin="anonymous"
        />
      )}

      <div className="relative p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {logoUrl && (
              <img src={logoUrl} alt="logo" className="w-14 h-14 object-contain" crossOrigin="anonymous" />
            )}
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 leading-tight truncate">{emisorNombre || "CD BUSTARVIEJO"}</h2>
              <div className="text-[8.5px] text-slate-500 leading-tight mt-0.5 space-y-0.5">
                {emisorCif && <p>CIF: {emisorCif}</p>}
                {emisorDireccion && <p>{emisorDireccion}</p>}
                {emisorCp && <p>{emisorCp}</p>}
                {(emisorEmail || emisorTelefono) && (
                  <p>{[emisorEmail, emisorTelefono].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-500 rounded-md px-3 py-2 text-right flex-shrink-0">
            <p className="text-[9px] font-bold text-slate-900 tracking-wider">FACTURA</p>
            <p className="text-[8px] text-slate-500 mt-1">Nº</p>
            <p className="text-base font-black text-orange-600 leading-tight">{numero || "—"}</p>
            <div className="mt-1 text-[8px] text-slate-600">
              <p>Fecha: <span className="font-bold text-slate-900">{fechaFmt || "—"}</span></p>
              {fechaVencFmt && <p>Vto.: <span className="font-bold text-slate-900">{fechaVencFmt}</span></p>}
            </div>
          </div>
        </div>

        {/* Datos cliente */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 mb-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-600" />
          <p className="text-[8px] font-bold text-orange-600 tracking-wider ml-1">FACTURAR A</p>
          <p className="text-[11px] font-bold text-slate-900 ml-1 mt-0.5">{clienteNombre || "—"}</p>
          <div className="text-[8.5px] text-slate-600 ml-1 mt-0.5 space-y-0.5">
            {clienteCif && <p>CIF/NIF: {clienteCif}</p>}
            {clienteDireccion && <p>{clienteDireccion}</p>}
            {clienteCp && <p>{clienteCp}</p>}
            {clienteEmail && <p>{clienteEmail}</p>}
          </div>
        </div>

        {/* Tabla */}
        <div className="border border-slate-200 rounded-md overflow-hidden mb-3">
          <div className="bg-slate-800 text-white text-[8px] font-bold grid grid-cols-12 px-2 py-1.5">
            <div className="col-span-7">CONCEPTO</div>
            <div className="col-span-1 text-right">CANT.</div>
            <div className="col-span-2 text-right">PRECIO</div>
            <div className="col-span-2 text-right">TOTAL</div>
          </div>
          {items.map((l, i) => {
            const cant = parseFloat(String(l.cantidad || 1).replace(",", ".")) || 0;
            const precio = parseFloat(String(l.precio || 0).replace(",", ".")) || 0;
            return (
              <div key={i} className={`grid grid-cols-12 px-2 py-1.5 text-[8.5px] ${i % 2 ? "bg-slate-50" : ""}`}>
                <div className="col-span-7 text-slate-800 break-words pr-1">{l.descripcion || "—"}</div>
                <div className="col-span-1 text-right text-slate-700">{cant}</div>
                <div className="col-span-2 text-right text-slate-700">{fmtMoney(precio)}</div>
                <div className="col-span-2 text-right font-bold text-slate-900">{fmtMoney(cant * precio)}</div>
              </div>
            );
          })}
        </div>

        {/* Totales */}
        <div className="ml-auto w-1/2 mb-3">
          <div className="flex justify-between text-[9px] py-0.5">
            <span className="text-slate-600">Base imponible</span>
            <span className="font-bold text-slate-900">{fmtMoney(totals.base)}</span>
          </div>
          <div className="flex justify-between text-[9px] py-0.5 border-b border-slate-200 pb-1">
            <span className="text-slate-600">IVA ({totals.ivaPct}%)</span>
            <span className="font-bold text-slate-900">{fmtMoney(totals.ivaImporte)}</span>
          </div>
          <div className="flex justify-between items-center bg-orange-600 text-white rounded-md px-2 py-1.5 mt-1">
            <span className="font-bold text-[9px]">TOTAL</span>
            <span className="font-black text-[12px]">{fmtMoney(totals.total)}</span>
          </div>
        </div>

        {/* Forma de pago + observaciones */}
        <div className="grid grid-cols-2 gap-2 mb-2 text-[8.5px]">
          {(formaPago || iban) && (
            <div className="bg-orange-50 border border-orange-300 rounded-md p-1.5">
              <p className="text-[7.5px] font-bold text-orange-600 tracking-wider">FORMA DE PAGO</p>
              {formaPago && <p className="text-slate-800">{formaPago}</p>}
              {iban && <p className="font-bold text-slate-900 mt-0.5 break-all">IBAN: {iban}</p>}
            </div>
          )}
          {observaciones && (
            <div className="text-slate-600">
              <p className="text-[7.5px] font-bold text-slate-500 tracking-wider">OBSERVACIONES</p>
              <p className="text-[8px] leading-tight">{observaciones}</p>
            </div>
          )}
        </div>

        {/* Firma + sello */}
        <div className="mt-auto flex items-end justify-between gap-2 pb-2">
          {selloUrl ? (
            <img src={selloUrl} alt="sello" className="w-20 h-20 object-contain opacity-90 -rotate-6 flex-shrink-0" crossOrigin="anonymous" />
          ) : <div className="w-20" />}

          <div className="text-center relative flex-shrink-0">
            {firmaUrl && (
              <img
                src={firmaUrl}
                alt="firma"
                className="absolute -top-10 left-1/2 -translate-x-1/2 h-12 object-contain"
                crossOrigin="anonymous"
              />
            )}
            <div className="w-44 border-t-2 border-slate-700 pt-0.5">
              <p className="text-[7.5px] font-bold text-orange-600 tracking-wider">EL PRESIDENTE</p>
              <p className="text-[9px] font-bold text-slate-900">Manuel Bermudo Santacruz</p>
              <p className="text-[7.5px] text-slate-500 italic">DNI: 51404895X</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}