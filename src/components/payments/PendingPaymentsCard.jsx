import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CreditCard, ChevronRight } from "lucide-react";

export default function PendingPaymentsCard({ count = 0, to = createPageUrl("ParentPayments") }) {
  if (!count || count <= 0) return null;
  return (
    <Link to={to} className="block">
      <div className="w-full bg-white rounded-xl border border-slate-200 shadow-elegant p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Pagos Pendientes</p>
            <p className="text-xs text-slate-500">{count} pago{count !== 1 ? 's' : ''} por realizar</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>
    </Link>
  );
}