import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Search, Users, Clock, Loader2, Award, ShieldCheck, Contact } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import FichaEntrenadorDialog from "@/components/coach/FichaEntrenadorDialog";

export default function CoachProfiles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editando, setEditando] = useState(null);
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = me?.role === 'admin';

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
    <div className="mx-auto w-full max-w-[1600px] space-y-5 px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><Users className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Club Deportivo Bustarviejo · Equipo técnico</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Perfiles de entrenadores</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Consulta quién forma parte del cuerpo técnico, las categorías que entrena y sus datos de contacto disponibles.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 sm:min-w-[150px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/15 text-orange-300"><Contact className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold text-white">{isLoading ? "—" : coaches.length}</p><p className="text-xs text-slate-300">Entrenadores</p></div>
          </div>
        </div>
      </section>

      {/* Buscador */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 focus-visible:bg-white"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm sm:min-w-[170px]">
            <span className="text-slate-500">Resultados</span><span className="font-bold text-slate-900">{filteredCoaches.length}</span>
          </div>
        </div>
      </section>

      {/* Grid de Entrenadores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
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
            <Card key={coach.id} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
              <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300" />
              <CardContent className="space-y-4 p-4 sm:p-5">
                {/* Foto y Nombre */}
                <div className="flex flex-col items-center text-center">
                  {coach.foto_perfil_url ? (
                    <img
                      src={coach.foto_perfil_url}
                      alt={coach.full_name}
                      className="mb-4 h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg ring-4 ring-orange-100 sm:h-36 sm:w-36 lg:h-40 lg:w-40"
                    />
                  ) : (
                    <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-slate-700 to-slate-900 text-4xl font-bold text-white shadow-lg ring-4 ring-orange-200 sm:h-36 sm:w-36 lg:h-40 lg:w-40">
                      {coach.full_name?.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
                    </div>
                  )}
                  <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">{coach.full_name}</h3>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700"><ShieldCheck className="h-3.5 w-3.5" /> Entrenador</div>
                  {isAdmin && (
                    <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                      <p>{coach.nombre_completo_oficial || <span className="text-red-600">Sin nombre completo</span>}</p>
                      <p>DNI: {coach.dni_entrenador || <span className="text-red-600">pendiente</span>}</p>
                      <Button size="sm" variant="outline" className="mt-2 h-9 rounded-lg border-slate-200" onClick={() => setEditando(coach)}>✏️ Editar ficha</Button>
                    </div>
                  )}
                </div>

                {/* Categorías */}
                {coach.categorias_entrena && coach.categorias_entrena.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {coach.categorias_entrena.map(cat => (
                      <Badge key={cat} className="rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Bio */}
                {coach.bio_entrenador && (
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-center"><Award className="mx-auto mb-1 h-4 w-4 text-orange-500" /><p className="text-sm italic leading-relaxed text-slate-600">“{coach.bio_entrenador}”</p></div>
                )}

                {/* Disponibilidad (solo admin) */}
                {coach.disponibilidad && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-semibold">Disponibilidad:</span>
                    </div>
                    <p className="text-xs text-slate-600">{coach.disponibilidad}</p>
                  </div>
                )}

                {/* Contacto */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
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

      {editando && <FichaEntrenadorDialog coach={editando} onClose={() => setEditando(null)} />}

      {/* Totales */}
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><Users className="h-4 w-4 text-orange-500" /><span><strong className="text-slate-900">{filteredCoaches.length}</strong> entrenador{filteredCoaches.length !== 1 ? 'es' : ''}{searchTerm ? ' encontrado' + (filteredCoaches.length !== 1 ? 's' : '') : ' en el listado'}</span></div>
    </div>
  );
}