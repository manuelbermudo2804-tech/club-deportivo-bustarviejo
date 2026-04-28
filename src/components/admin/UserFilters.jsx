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
  ];

  return (
    <div className="bg-white rounded-lg shadow p-3 space-y-3">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email, DNI o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded px-3 py-1">
          <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} className="scale-90" />
          <Label htmlFor="show-deleted" className="text-xs cursor-pointer">
            Eliminados
          </Label>
        </div>
      </div>

      <Button
        size="sm"
        onClick={onDetectPairs}
        disabled={isDetectingPairs}
        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-sm"
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

      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setRoleFilter(f.key)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              roleFilter === f.key
                ? "bg-orange-600 text-white"
                : f.highlight && f.count > 0
                ? "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>
    </div>
  );
}