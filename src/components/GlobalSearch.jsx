import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, CreditCard, Bell, Calendar, Megaphone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function GlobalSearch({ isAdmin = false, isCoach = false, isTreasurer = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players', isOpen],
    queryFn: async () => {
      if (!isOpen) return [];
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return [];
        const me = await base44.auth.me();
        const isStaff = me?.role === 'admin' || me?.es_entrenador || me?.es_coordinador || me?.es_tesorero;
        if (isStaff) {
          return await base44.entities.Player.list('-updated_date', 200);
        }
        return await base44.entities.Player.filter({
          $or: [
            { email_padre: me.email },
            { email_tutor_2: me.email },
            { email_jugador: me.email },
          ]
        }, '-updated_date', 200);
      } catch {
        return [];
      }
    },
    initialData: [],
    enabled: isOpen,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
    enabled: isOpen && (isAdmin || isTreasurer),
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
    enabled: isOpen,
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list(),
    initialData: [],
    enabled: isOpen,
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
    enabled: isOpen,
  });

  const filterResults = (items, fields) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      fields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(term);
      })
    );
  };

  const filteredPlayers = filterResults(players, ['nombre', 'email_padre', 'deporte', 'telefono']);
  const filteredPayments = filterResults(payments, ['jugador_nombre', 'mes', 'temporada', 'estado']);
  const filteredCallups = filterResults(callups, ['titulo', 'categoria', 'rival', 'ubicacion']);
  const filteredAnnouncements = filterResults(announcements, ['titulo', 'contenido', 'destinatarios_tipo']);
  const filteredEvents = filterResults(events, ['titulo', 'descripcion', 'tipo', 'deporte', 'ubicacion']);

  const allResults = [
    ...filteredPlayers.map(p => ({ type: 'player', item: p })),
    ...((isAdmin || isTreasurer) ? filteredPayments.map(p => ({ type: 'payment', item: p })) : []),
    ...filteredCallups.map(c => ({ type: 'callup', item: c })),
    ...filteredAnnouncements.map(a => ({ type: 'announcement', item: a })),
    ...filteredEvents.map(e => ({ type: 'event', item: e }))
  ].slice(0, 20);

  const getResultIcon = (type) => {
    switch(type) {
      case 'player': return Users;
      case 'payment': return CreditCard;
      case 'callup': return Bell;
      case 'announcement': return Megaphone;
      case 'event': return Calendar;
      default: return Search;
    }
  };

  const getResultUrl = (type, item) => {
    switch(type) {
      case 'player': return createPageUrl("Players");
      case 'payment': return createPageUrl("Payments") + `?jugador_id=${item.jugador_id}`;
      case 'callup': return (isAdmin || isCoach) ? createPageUrl("CoachCallups") : createPageUrl("ParentCallups");
      case 'announcement': return createPageUrl("Announcements");
      case 'event': return createPageUrl("Calendar");
      default: return "#";
    }
  };

  const getResultTitle = (type, item) => {
    switch(type) {
      case 'player': return item.nombre;
      case 'payment': return `${item.jugador_nombre} - ${item.mes}`;
      case 'callup': return item.titulo;
      case 'announcement': return item.titulo;
      case 'event': return item.titulo;
      default: return "";
    }
  };

  const getResultSubtitle = (type, item) => {
    switch(type) {
      case 'player': return item.deporte;
      case 'payment': return `${item.cantidad}€ - ${item.estado}`;
      case 'callup': return `${item.categoria} - ${item.fecha_partido}`;
      case 'announcement': return item.destinatarios_tipo;
      case 'event': return `${item.tipo} - ${item.fecha}`;
      default: return "";
    }
  };

  const getResultBadge = (type, item) => {
    switch(type) {
      case 'player': return item.activo ? { text: "Activo", color: "bg-green-500" } : { text: "Inactivo", color: "bg-slate-400" };
      case 'payment': 
        if (item.estado === "Pagado") return { text: "Pagado", color: "bg-green-500" };
        if (item.estado === "Pendiente") return { text: "Pendiente", color: "bg-orange-500" };
        return { text: "En Revisión", color: "bg-blue-500" };
      case 'callup': return item.publicada ? { text: "Publicada", color: "bg-green-500" } : { text: "Borrador", color: "bg-slate-400" };
      case 'announcement': return item.publicado ? { text: "Publicado", color: "bg-green-500" } : { text: "Borrador", color: "bg-slate-400" };
      case 'event': return item.publicado ? { text: "Visible", color: "bg-green-500" } : { text: "Oculto", color: "bg-slate-400" };
      default: return null;
    }
  };

  const ResultItem = ({ type, item }) => {
    const Icon = getResultIcon(type);
    const badge = getResultBadge(type, item);
    
    return (
      <Link 
        to={getResultUrl(type, item)} 
        onClick={() => setIsOpen(false)}
        className="block"
      >
        <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-orange-200">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-slate-900 truncate">{getResultTitle(type, item)}</p>
              {badge && (
                <Badge className={`${badge.color} text-white text-xs flex-shrink-0`}>
                  {badge.text}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 truncate">{getResultSubtitle(type, item)}</p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-slate-500 hover:text-slate-900"
      >
        <Search className="w-4 h-4 mr-2" />
        <span className="hidden lg:inline">Buscar...</span>
        <kbd className="hidden lg:inline ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-xs font-medium opacity-100">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar jugadores, pagos, convocatorias..."
                className="border-0 focus-visible:ring-0 text-lg"
                autoFocus
              />
              {searchTerm && (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
            <TabsList>
              <TabsTrigger value="all">Todo ({allResults.length})</TabsTrigger>
              <TabsTrigger value="players">Jugadores ({filteredPlayers.length})</TabsTrigger>
              {(isAdmin || isTreasurer) && <TabsTrigger value="payments">Pagos ({filteredPayments.length})</TabsTrigger>}
              <TabsTrigger value="callups">Convocatorias ({filteredCallups.length})</TabsTrigger>
              <TabsTrigger value="events">Eventos ({filteredEvents.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="overflow-y-auto max-h-[50vh] px-4 pb-4">
            {activeTab === "all" && (
              <div className="space-y-1">
                {allResults.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      {searchTerm ? "No se encontraron resultados" : "Escribe para buscar"}
                    </p>
                  </div>
                ) : (
                  allResults.map((result, idx) => (
                    <ResultItem key={idx} type={result.type} item={result.item} />
                  ))
                )}
              </div>
            )}

            {activeTab === "players" && (
              <div className="space-y-1">
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No se encontraron jugadores</p>
                  </div>
                ) : (
                  filteredPlayers.map(player => (
                    <ResultItem key={player.id} type="player" item={player} />
                  ))
                )}
              </div>
            )}

            {(isAdmin || isTreasurer) && activeTab === "payments" && (
              <div className="space-y-1">
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No se encontraron pagos</p>
                  </div>
                ) : (
                  filteredPayments.map(payment => (
                    <ResultItem key={payment.id} type="payment" item={payment} />
                  ))
                )}
              </div>
            )}

            {activeTab === "callups" && (
              <div className="space-y-1">
                {filteredCallups.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No se encontraron convocatorias</p>
                  </div>
                ) : (
                  filteredCallups.map(callup => (
                    <ResultItem key={callup.id} type="callup" item={callup} />
                  ))
                )}
              </div>
            )}

            {activeTab === "events" && (
              <div className="space-y-1">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No se encontraron eventos</p>
                  </div>
                ) : (
                  filteredEvents.map(event => (
                    <ResultItem key={event.id} type="event" item={event} />
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}