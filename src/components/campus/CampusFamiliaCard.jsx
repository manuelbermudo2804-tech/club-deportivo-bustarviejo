import React, { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import CampusFichaMenor from "@/components/campus/CampusFichaMenor";

const money = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v || 0));
const pill = (ok) => `inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`;

export default function CampusFamiliaCard({ r, kids, onStatus, onEdit, onDelete, deleting }) {
  const [open, setOpen] = useState(false);
  const completada = r.estado === "confirmada" && r.estado_pago === "pagado" && ["pagado", "no_requerida"].includes(r.estado_alta_socio || "no_requerida");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-black text-slate-900">{r.adulto_nombre}</p>
          <p className="text-xs text-slate-500 break-all">{r.adulto_email || "Sin correo"} · {r.adulto_telefono || "Sin teléfono"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={pill(r.estado === "confirmada")}>{completada ? "Completada" : (r.estado || "pendiente")}</span>
          <span className={pill(r.estado_pago === "pagado")}>Pago: {r.estado_pago || "pendiente"}</span>
          {r.estado_alta_socio && r.estado_alta_socio !== "no_requerida" && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Socio: {r.estado_alta_socio}</span>}
          <span className="text-base font-black text-slate-900">{money(r.importe_total)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {kids.map(k => (
          <span key={k.id} className="rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs">
            <b className="text-slate-900">{k.nombre}</b> <span className="text-slate-500">· {k.grupo_edad} · {(k.semanas_ocupadas || []).join(", ") || "sin semanas"}</span>
          </span>
        ))}
        {kids.length === 0 && <span className="text-xs text-slate-400">Sin menores</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <select aria-label="Estado de inscripción" value={r.estado || "pendiente"} onChange={e => onStatus(r, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
          <option value="pendiente">Pendiente</option><option value="revision">En revisión</option><option value="confirmada">Confirmada</option><option value="cancelada">Cancelada</option>
        </select>
        {kids.length > 0 && <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-50">{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}Fichas de salud</button>}
        <button onClick={() => onEdit(r)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Editar contacto</button>
        <button onClick={() => onDelete(r)} disabled={deleting} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deleting ? "Borrando…" : "Borrar"}</button>
      </div>

      {open && <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{kids.map(k => <CampusFichaMenor key={k.id} k={k} />)}</div>}
    </div>
  );
}