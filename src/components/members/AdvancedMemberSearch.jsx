import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Filter, User, Phone, Mail, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdvancedMemberSearch({ players, users }) {
  const [filters, setFilters] = useState({
    nombre: "",
    deporte: "all",
    activo: "all",
    tipo_inscripcion: "all",
    email_padre: "",
    telefono: "",
    mes_nacimiento: "all",
    tiene_pagos_pendientes: "all"
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      nombre: "",
      deporte: "all",
      activo: "all",
      tipo_inscripcion: "all",
      email_padre: "",
      telefono: "",
      mes_nacimiento: "all",
      tiene_pagos_pendientes: "all"
    });
  };

  const filteredPlayers = players.filter(player => {
    if (filters.nombre && !player.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) {
      return false;
    }
    if (filters.deporte !== "all" && player.deporte !== filters.deporte) {
      return false;
    }
    if (filters.activo !== "all") {
      const isActive = filters.activo === "true";
      if (player.activo !== isActive) return false;
    }
    if (filters.tipo_inscripcion !== "all" && player.tipo_inscripcion !== filters.tipo_inscripcion) {
      return false;
    }
    if (filters.email_padre && !player.email_padre?.toLowerCase().includes(filters.email_padre.toLowerCase())) {
      return false;
    }
    if (filters.telefono && !player.telefono?.includes(filters.telefono)) {
      return false;
    }
    if (filters.mes_nacimiento !== "all" && player.fecha_nacimiento) {
      const birthMonth = new Date(player.fecha_nacimiento).getMonth() + 1;
      if (birthMonth.toString() !== filters.mes_nacimiento) return false;
    }
    return true;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== "all").length;

  const deportes = [...new Set(players.map(p => p.deporte))].sort();

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-600" />
              Búsqueda Avanzada de Miembros
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-orange-500">{activeFiltersCount}</Badge>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Búsqueda rápida por nombre</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={filters.nombre}
                  onChange={(e) => handleFilterChange("nombre", e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="pl-10"
                />
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label>Deporte/Categoría</Label>
                  <Select
                    value={filters.deporte}
                    onValueChange={(value) => handleFilterChange("deporte", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {deportes.map(deporte => (
                        <SelectItem key={deporte} value={deporte}>{deporte}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Estado</Label>
                  <Select
                    value={filters.activo}
                    onValueChange={(value) => handleFilterChange("activo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="true">Activos</SelectItem>
                      <SelectItem value="false">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo Inscripción</Label>
                  <Select
                    value={filters.tipo_inscripcion}
                    onValueChange={(value) => handleFilterChange("tipo_inscripcion", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Nueva Inscripción">Nueva Inscripción</SelectItem>
                      <SelectItem value="Renovación">Renovación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Email Padre/Tutor</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={filters.email_padre}
                      onChange={(e) => handleFilterChange("email_padre", e.target.value)}
                      placeholder="Buscar por email..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={filters.telefono}
                      onChange={(e) => handleFilterChange("telefono", e.target.value)}
                      placeholder="Buscar por teléfono..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Mes de Nacimiento</Label>
                  <Select
                    value={filters.mes_nacimiento}
                    onValueChange={(value) => handleFilterChange("mes_nacimiento", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="1">Enero</SelectItem>
                      <SelectItem value="2">Febrero</SelectItem>
                      <SelectItem value="3">Marzo</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Mayo</SelectItem>
                      <SelectItem value="6">Junio</SelectItem>
                      <SelectItem value="7">Julio</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Septiembre</SelectItem>
                      <SelectItem value="10">Octubre</SelectItem>
                      <SelectItem value="11">Noviembre</SelectItem>
                      <SelectItem value="12">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {activeFiltersCount > 0 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-slate-600">
                  {filteredPlayers.length} resultado{filteredPlayers.length !== 1 ? 's' : ''} encontrado{filteredPlayers.length !== 1 ? 's' : ''}
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.length === 0 ? (
          <Card className="col-span-full border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No se encontraron jugadores</p>
            </CardContent>
          </Card>
        ) : (
          filteredPlayers.map(player => (
            <Link key={player.id} to={createPageUrl("PlayerProfile") + `?id=${player.id}`}>
              <Card className="border-none shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {player.foto_url ? (
                      <img 
                        src={player.foto_url} 
                        alt={player.nombre}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{player.nombre}</h3>
                      <p className="text-xs text-slate-600 truncate">{player.deporte}</p>
                      <div className="flex gap-1 mt-2">
                        <Badge className={player.activo ? "bg-green-500 text-white" : "bg-slate-400 text-white"}>
                          {player.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {player.tipo_inscripcion}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}