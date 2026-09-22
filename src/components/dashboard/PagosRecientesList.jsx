import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CreditCard, Banknote, CheckCircle2, ChevronRight } from "lucide-react";

const ORIGEN_STYLE = {
  "Tarjeta (Stripe)": { icon: CreditCard, color: "text-emerald-400", badge: "bg-emerald-600" },
  "Tarjeta (plan mensual)": { icon: CreditCard, color: "text-emerald-400", badge: "bg-emerald-600" },
  "Efectivo (marcado por el club)": { icon: Banknote, color: "text-amber-400", badge: "bg-amber-600" },
};

export default function PagosRecientesList({ pagos }) {
  if (!pagos?.length) return null;

  return (
    <div>
      <p className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
        💰 Pagos registrados ({pagos.length})
      </p>
      <div className="space-y-1">
        {pagos.map((p) => {
          const style = ORIGEN_STYLE[p.origen] || { icon: CheckCircle2, color: "text-slate-400", badge: "bg-slate-600" };
          const Icon = style.icon;
          return (
            <Link
              key={p.id}
              to={createPageUrl(p.page || "Payments")}
              className="flex items-center gap-2.5 bg-slate-900/50 hover:bg-slate-900 rounded-lg px-2.5 py-2 transition-colors"
            >
              <Icon className={`w-4 h-4 ${style.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{p.nombre || "Sin nombre"}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {p.origen}{p.detalle ? ` · ${p.detalle}` : ""}
                </p>
              </div>
              <span className={`${style.badge} text-white text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0`}>
                {p.importe}€
              </span>
              <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}