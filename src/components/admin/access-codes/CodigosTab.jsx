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
    { key: 'pendiente', label: 'Pendientes', value: counts.pendiente, color: 'yellow', icon: Clock },
    { key: 'expirado', label: 'Expirados', value: counts.expirado, color: 'red', icon: AlertCircle },
    { key: 'usado', label: 'Completados', value: counts.usado, color: 'green', icon: CheckCircle2 },
    { key: 'all', label: 'Total', value: counts.total, color: 'slate', icon: KeyRound },
  ];

  return (
    <div className="space-y-4">
      {/* Stats clicables */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => {
          const active = filter === s.key;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`text-left rounded-2xl p-4 border-2 transition-all ${
                active
                  ? `bg-${s.color}-100 border-${s.color}-500 ring-2 ring-${s.color}-200`
                  : `bg-${s.color}-50 border-${s.color}-200 hover:border-${s.color}-400`
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
                {active && <span className={`text-[10px] font-bold text-${s.color}-700 uppercase`}>Filtro activo</span>}
              </div>
              <p className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</p>
              <p className={`text-xs text-${s.color}-600`}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por email, nombre o código..."
          className="pl-10"
        />
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