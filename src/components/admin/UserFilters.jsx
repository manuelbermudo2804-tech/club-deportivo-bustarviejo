import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Wand2 } from "lucide-react";

export default function UserFilters({
  searchTerm,
  setSearchTerm,
  showDeleted,
  setShowDeleted,
  roleFilter,
  setRoleFilter,
  filterCounts,
  isDetectingPairs,
  onDetectPairs,
}) {
  const filters = [
    { key: "all", label: "Todos", count: filterCounts.all },
    { key: "parent", label: "👨‍👩‍👧 Padres", count: filterCounts.parent },
    { key: "inactive_parents", label: "🔴 Sin Hijos", count: filterCounts.inactive_parents, highlight: true },
    { key: "staff", label: "👔 Staff", count: filterCounts.staff },
    { key: "admin", label: "🎓 Admin", count: filterCounts.admin },
    { key: "player", label: "⚽ Jugad.+18", count: filterCounts.player },
    { key: "pending_player", label: "⚽ +18 pendientes", count: filterCounts.pending_player || 0, highlight: (filterCounts.pending_player || 0) > 0 },
    { key: "minor", label: "🧒 Juvenil", count: filterCounts.minor },
    {
      key: "inactive_minors",
      label: "🧒🔴 Juv. Inact.",
      count: filterCounts.inactive_minors,
      highlight: filterCounts.inactive_minors > 0,
    },
    { key: "coach", label: "🏃 Entren.", count: filterCounts.coach },
    { key: "coordinator", label: "🎓 Coord.", count: filterCounts.coordinator },
    { key: "treasurer", label: "💰 Tesor.", count: filterCounts.treasurer },
    { key: "restricted", label: "🚫 Restrin.", count: filterCounts.restricted },
    { key: "with_app", label: "📲 App", count: filterCounts.with_app },
    { key: "without_app", label: "📵 Sin", count: filterCounts.without_app },
    {
      key: "unvalidated",
      label: "👻 Sin código",
      count: filterCounts.unvalidated || 0,
      highlight: (filterCounts.unvalidated || 0) > 0,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-4 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email, DNI o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-white pl-9 text-sm shadow-sm placeholder:text-slate-400 focus-visible:ring-orange-500"
          />
        </div>
        <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${showDeleted ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}>
          <Switch
            id="show-deleted"
            checked={showDeleted}
            onCheckedChange={(checked) => {
              setShowDeleted(checked);
              // Al abrir eliminados, quitar otros filtros para que no parezca que faltan cuentas.
              if (checked) setRoleFilter("all");
            }}
          />
          <div className="min-w-0">
            <Label htmlFor="show-deleted" className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
              Cuentas eliminadas
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${showDeleted ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                {filterCounts.deleted ?? 0}
              </span>
            </Label>
            <p className="text-xs text-slate-500">Mostrar y restaurar cuentas eliminadas</p>
          </div>
        </div>
      </div>

      <Button
        size="sm"
        onClick={onDetectPairs}
        disabled={isDetectingPairs}
        className="w-full justify-center rounded-xl border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-800 shadow-none hover:bg-orange-100 sm:w-auto"
      >
        {isDetectingPairs ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Detectando...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            🔍 Detectar Parejas Automáticamente
          </>
        )}
      </Button>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Filtrar usuarios</p>
            <p className="text-xs text-slate-500">Selecciona un grupo para ver sus cuentas</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{filters.find((f) => f.key === roleFilter)?.count ?? 0} usuarios</span>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {filters.map((f) => {
            const selected = roleFilter === f.key;
            const warning = f.highlight && f.count > 0;
            return (
              <button
                key={f.key}
                onClick={() => setRoleFilter(f.key)}
                aria-pressed={selected}
                className={`flex min-h-[58px] min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  selected
                    ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                    : warning
                    ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/60"
                }`}
              >
                <span className="min-w-0 text-xs font-medium leading-snug sm:text-sm">{f.label.replace(/^👨‍👩‍👧 /, "").replace(/^👔 /, "").replace(/^🎓 /, "").replace(/^⚽ /, "").replace(/^🧒 /, "").replace(/^🏃 /, "").replace(/^💰 /, "").replace(/^🚫 /, "").replace(/^📲 /, "").replace(/^📵 /, "").replace(/^👻 /, "").replace(/^🔴 /, "")}</span>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${selected ? "bg-white/20 text-white" : warning ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{f.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}