import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Download } from "lucide-react";

export default function MemberAdvancedFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  seasonFilter,
  setSeasonFilter,
  typeFilter,
  setTypeFilter,
  availableSeasons = [],
  onExport,
  activeFiltersCount
}) {
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSeasonFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-3">
      {/* Barra principal de búsqueda */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filtro de estado */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Estado de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pagado">✅ Pagado</SelectItem>
            <SelectItem value="En revisión">⏳ En revisión</SelectItem>
            <SelectItem value="Pendiente">❌ Pendiente</SelectItem>
            <SelectItem value="Fallido">⚠️ Fallido</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro de temporada */}
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Temporada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {availableSeasons.map(season => (
              <SelectItem key={season} value={season}>{season}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro de tipo */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="Nueva Inscripción">🆕 Nueva Inscripción</SelectItem>
            <SelectItem value="Renovación">🔄 Renovación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Barra de acciones y filtros activos */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {activeFiltersCount > 0 && (
            <>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Filter className="w-3 h-3 mr-1" /> {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-slate-700">
                <X className="w-3 h-3 mr-1" /> Limpiar filtros
              </Button>
            </>
          )}
        </div>

        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        )}
      </div>
    </div>
  );
}