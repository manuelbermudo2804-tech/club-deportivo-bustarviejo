import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Clock, KeyRound, Loader2, Search } from "lucide-react";

/**
 * Pestaña Códigos: lista de códigos generados con stats clicables como filtro.
 */
export default function CodigosTab({
  counts, filter, setFilter, searchTerm, setSearchTerm,
  filtered, isLoading, CodeCard, resendMutation, cancelMutation, deleteMutation, resendingId,
  phoneByEmail = {},
}) {
  const statCards = [
    { key: 'pendiente', label: 'Pendientes', value: counts.pendiente, icon: Clock, active: 'border-amber-400 bg-amber-50 ring-2 ring-amber-100', idle: 'border-slate-200 bg-white hover:border-amber-300', iconTone: 'bg-amber-100 text-amber-700', valueTone: 'text-amber-700' },
    { key: 'expirado', label: 'Expirados', value: counts.expirado, icon: AlertCircle, active: 'border-rose-400 bg-rose-50 ring-2 ring-rose-100', idle: 'border-slate-200 bg-white hover:border-rose-300', iconTone: 'bg-rose-100 text-rose-700', valueTone: 'text-rose-700' },
    { key: 'usado', label: 'Completados', value: counts.usado, icon: CheckCircle2, active: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100', idle: 'border-slate-200 bg-white hover:border-emerald-300', iconTone: 'bg-emerald-100 text-emerald-700', valueTone: 'text-emerald-700' },
    { key: 'all', label: 'Total', value: counts.total, icon: KeyRound, active: 'border-slate-400 bg-slate-50 ring-2 ring-slate-100', idle: 'border-slate-200 bg-white hover:border-slate-400', iconTone: 'bg-slate-100 text-slate-700', valueTone: 'text-slate-800' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats clicables */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(s => {
          const active = filter === s.key;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              aria-pressed={active}
              className={`rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${active ? s.active : s.idle}`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconTone}`}><Icon className="h-4 w-4" /></span>
                {active && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">Activo</span>}
              </div>
              <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${s.valueTone}`}>{s.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{s.label}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <Search className="h-4 w-4 text-orange-600" />
          <p className="text-sm font-semibold text-slate-800">Buscar invitaciones</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Email, nombre, jugador o código..."
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 focus-visible:bg-white"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">Mostrando {filtered.length} invitación{filtered.length !== 1 ? 'es' : ''} con los filtros actuales.</p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <KeyRound className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No hay invitaciones {filter !== 'all' ? `con estado "${filter}"` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(code => (
            <CodeCard
              key={code.id}
              code={code}
              onResend={(id) => resendMutation.mutate(id)}
              onCancel={(id) => cancelMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isResending={resendingId === code.id}
              telefono={phoneByEmail[code.email?.toLowerCase()] || ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}