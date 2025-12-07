import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, User, FileText } from "lucide-react";

export default function SearchFilters({ 
  searchTerm, 
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterPerson,
  onFilterPersonChange,
  filterDate,
  onFilterDateChange,
  allParticipants
}) {
  return (
    <div className="space-y-2 p-3 bg-white border-b">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar mensajes..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <Select value={filterType} onValueChange={onFilterTypeChange}>
          <SelectTrigger className="h-8 text-xs">
            <FileText className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="files">Archivos</SelectItem>
            <SelectItem value="images">Imágenes</SelectItem>
            <SelectItem value="polls">Encuestas</SelectItem>
            <SelectItem value="locations">Ubicaciones</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPerson} onValueChange={onFilterPersonChange}>
          <SelectTrigger className="h-8 text-xs">
            <User className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Persona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {allParticipants.map(p => (
              <SelectItem key={p.email} value={p.email}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDate} onValueChange={onFilterDateChange}>
          <SelectTrigger className="h-8 text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Fecha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}