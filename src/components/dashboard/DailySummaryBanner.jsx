import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Sparkles, ChevronDown, ChevronUp, ChevronRight, CheckCircle2,
  UserPlus, CreditCard, KeyRound, Users, Shirt, Clover, Mail, ClipboardList,
  MessageSquare, Globe, PartyPopper, Hash, Handshake, Briefcase, FileText,
  Trophy, Heart, ShieldAlert, AlertTriangle, Bell,
} from "lucide-react";

const ICONS = {
  UserPlus, CreditCard, KeyRound, Users, Shirt, Clover, Mail, ClipboardList,
  MessageSquare, Globe, PartyPopper, Hash, Handshake, Briefcase, FileText,
  Trophy, Heart, ShieldAlert, AlertTriangle, Bell,
};

const LS_KEY = "admin_daily_summary_last_visit";

export default function DailySummaryBanner() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Última visita guardada (o 24h atrás la primera vez)
        const since = localStorage.getItem(LS_KEY) || new Date(Date.now() - 86400000).toISOString();
        const res = await base44.functions.invoke("dailySummary", { since });
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Al desplegar por primera vez, marcamos "visto ahora" para la próxima sesión
  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      try { localStorage.setItem(LS_KEY, new Date().toISOString()); } catch {}
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm">Cargando resumen del día...</p>
      </div>
    );
  }

  if (!data) return null;

  const totalNovedades = data.totales?.novedades || 0;
  const totalAtencion = data.totales?.atencion || 0;
  const nada = totalNovedades === 0 && totalAtencion === 0;

  return (
    <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl overflow-hidden">
      {/* Barra compacta (no estorba) */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/40 transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${nada ? 'bg-green-500/20' : 'bg-indigo-500/20'}`}>
          {nada
            ? <CheckCircle2 className="w-5 h-5 text-green-400" />
            : <Sparkles className="w-5 h-5 text-indigo-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Resumen del día</p>
          {nada ? (
            <p className="text-slate-400 text-xs">Todo al día, sin novedades desde tu última visita 🎉</p>
          ) : (
            <p className="text-slate-400 text-xs">
              {totalNovedades > 0 && <span className="text-indigo-300 font-semibold">{totalNovedades} novedades</span>}
              {totalNovedades > 0 && totalAtencion > 0 && " · "}
              {totalAtencion > 0 && <span className="text-orange-300 font-semibold">{totalAtencion} requieren atención</span>}
            </p>
          )}
        </div>
        {!nada && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {totalNovedades > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">{totalNovedades}</span>
            )}
            {totalAtencion > 0 && (
              <span className="bg-orange-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">{totalAtencion}</span>
            )}
          </div>
        )}
        {expanded
          ? <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />}
      </button>

      {/* Detalle desplegable */}
      {expanded && !nada && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-700/60 pt-3">
          {data.atencion?.length > 0 && (
            <Section title="⚠️ Requiere tu atención" items={data.atencion} accent="orange" />
          )}
          {data.novedades?.length > 0 && (
            <Section title="🆕 Novedades desde tu última visita" items={data.novedades} accent="indigo" />
          )}
        </div>
      )}
      {expanded && nada && (
        <div className="px-3 pb-3 border-t border-slate-700/60 pt-3">
          <p className="text-slate-400 text-xs text-center py-2">No hay nada pendiente ni nuevo. ¡Buen trabajo!</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, accent }) {
  const dot = accent === "orange" ? "text-orange-400" : "text-indigo-400";
  const badge = accent === "orange" ? "bg-orange-600" : "bg-indigo-600";
  return (
    <div>
      <p className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">{title}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.icon] || Bell;
          return (
            <Link
              key={item.id}
              to={createPageUrl(item.page)}
              className="flex items-center gap-2.5 bg-slate-900/50 hover:bg-slate-900 rounded-lg px-2.5 py-2 transition-colors"
            >
              <Icon className={`w-4 h-4 ${dot} flex-shrink-0`} />
              <span className="flex-1 text-sm text-slate-200 min-w-0 truncate">{item.label}</span>
              <span className={`${badge} text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center flex-shrink-0`}>{item.count}</span>
              <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}