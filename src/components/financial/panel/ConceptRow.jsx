import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { eur } from "./financeStats";

export default function ConceptRow({ icon: Icon, title, subtitle, cobrado, pendiente, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{title}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="text-right">
        <p className="font-bold text-green-700">{eur(cobrado)}</p>
        <p className="text-xs text-red-600">{pendiente > 0 ? `${eur(pendiente)} pendiente` : "Nada pendiente"}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}