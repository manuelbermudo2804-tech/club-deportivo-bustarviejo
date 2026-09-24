import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";
import { eur, fmtDate } from "@/components/subvencion/expedienteConfig";

const Ok = ({ ok }) => ok ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-red-500 mx-auto" />;

export default function GastoRow({ g, imputado, onToggle, onEdit }) {
  return (
    <tr className={`border-b text-sm ${imputado ? "bg-orange-50/60" : ""}`}>
      <td className="p-2 text-center"><Checkbox checked={imputado} onCheckedChange={onToggle} /></td>
      <td className="p-2 whitespace-nowrap">{fmtDate(g.fecha_factura || g.fecha)}</td>
      <td className="p-2">{g.proveedor_cliente || <span className="text-red-500">Sin proveedor</span>}</td>
      <td className="p-2">{g.concepto}<div className="text-xs text-slate-400">{g.categoria}</div></td>
      <td className="p-2">{g.numero_factura || <span className="text-red-500">—</span>}</td>
      <td className="p-2 text-right whitespace-nowrap">{eur(g.cantidad)}</td>
      <td className="p-2"><Ok ok={!!g.documento_url} /></td>
      <td className="p-2"><Ok ok={!!g.justificante_pago_url} /></td>
      <td className="p-2 whitespace-nowrap">{g.fecha_pago ? fmtDate(g.fecha_pago) : <span className="text-red-500">—</span>}</td>
      <td className="p-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button></td>
    </tr>
  );
}