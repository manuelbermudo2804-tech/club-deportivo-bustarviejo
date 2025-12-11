import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Search, Users, Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoachProfiles() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.es_entrenador === true);
    },
  });

  const filteredCoaches = coaches.filter(coach =>
    coach.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.categorias_entrena?.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-orange-600" />
          Perfiles de Entrenadores
        </h1>
        <p className="text-slate-600 mt-1">
          Información de contacto y perfil de todos los entrenadores del club
        </p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid de Entrenadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="w-20 h-20 rounded-full mx-auto" />
                <Skeleton className="h-6 w-32 mx-auto" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredCoaches.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No se encontraron entrenadores</p>
          </div>
        ) : (
          filteredCoaches.map(coach => (
            <Card key={coach.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                {/* Foto y Nombre */}
                <div className="text-center">
                  {coach.foto_perfil_url ? (
                    <img
                      src={coach.foto_perfil_url}
                      alt={coach.full_name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-orange-200 mx-auto mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold border-4 border-orange-200 mx-auto mb-3">
                      {coach.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-slate-900">{coach.full_name}</h3>
                  <p className="text-sm text-slate-600">🏃 Entrenador</p>
                </div>

                {/* Categorías */}
                {coach.categorias_entrena && coach.categorias_entrena.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {coach.categorias_entrena.map(cat => (
                      <Badge key={cat} className="bg-blue-100 text-blue-700 text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Bio */}
                {coach.bio_entrenador && (
                  <p className="text-sm text-slate-600 text-center italic">
                    "{coach.bio_entrenador}"
                  </p>
                )}

                {/* Disponibilidad (solo admin) */}
                {coach.disponibilidad && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-semibold">Disponibilidad:</span>
                    </div>
                    <p className="text-xs text-slate-600">{coach.disponibilidad}</p>
                  </div>
                )}

                {/* Contacto */}
                <div className="space-y-2 pt-2 border-t">
                  {coach.mostrar_email_publico && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-orange-600" />
                      <a href={`mailto:${coach.email}`} className="hover:text-orange-600 truncate">
                        {coach.email}
                      </a>
                    </div>
                  )}
                  {coach.mostrar_telefono_publico && coach.telefono_contacto && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-orange-600" />
                      <a href={`tel:${coach.telefono_contacto}`} className="hover:text-orange-600">
                        {coach.telefono_contacto}
                      </a>
                    </div>
                  )}
                  {!coach.mostrar_email_publico && !coach.mostrar_telefono_publico && (
                    <p className="text-xs text-slate-400 text-center italic">
                      Contacto disponible solo por chat
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Totales */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <p className="text-sm text-slate-600 text-center">
            <strong>{filteredCoaches.length}</strong> entrenador{filteredCoaches.length !== 1 ? 'es' : ''} 
            {searchTerm && ` encontrado${filteredCoaches.length !== 1 ? 's' : ''}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}