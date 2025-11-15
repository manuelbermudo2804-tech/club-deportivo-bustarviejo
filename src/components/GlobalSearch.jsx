import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Search, X, User, Calendar, Megaphone, CreditCard, Filter, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function GlobalSearch({ isAdmin, isCoach }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState({ players: [], events: [], announcements: [], payments: [], callups: [] });
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const searchData = async () => {
      if (searchTerm.length < 2) {
        setResults({ players: [], events: [], announcements: [], payments: [], callups: [] });
        return;
      }

      const term = searchTerm.toLowerCase();
      const newResults = { players: [], events: [], announcements: [], payments: [], callups: [] };

      try {
        // Search players
        const players = await base44.entities.Player.list();
        players.forEach(p => {
          if (p.nombre.toLowerCase().includes(term) || 
              p.email_padre?.toLowerCase().includes(term) ||
              p.deporte.toLowerCase().includes(term)) {
            newResults.players.push({
              type: 'player',
              icon: User,
              title: p.nombre,
              subtitle: p.deporte,
              detail: p.email_padre,
              url: isAdmin ? createPageUrl("Players") : createPageUrl("ParentPlayers"),
              color: "text-orange-600",
              badge: p.activo ? "Activo" : "Inactivo"
            });
          }
        });

        // Search events
        const events = await base44.entities.Event.list();
        events.forEach(e => {
          if (e.titulo.toLowerCase().includes(term) || 
              e.descripcion?.toLowerCase().includes(term) ||
              e.tipo.toLowerCase().includes(term)) {
            newResults.events.push({
              type: 'event',
              icon: Calendar,
              title: e.titulo,
              subtitle: `${e.tipo} - ${e.fecha}`,
              detail: e.ubicacion,
              url: createPageUrl("Calendar"),
              color: "text-blue-600",
              badge: e.importante ? "Importante" : e.tipo
            });
          }
        });

        // Search announcements
        const announcements = await base44.entities.Announcement.list();
        announcements.forEach(a => {
          if (a.titulo.toLowerCase().includes(term) || a.contenido?.toLowerCase().includes(term)) {
            newResults.announcements.push({
              type: 'announcement',
              icon: Megaphone,
              title: a.titulo,
              subtitle: a.prioridad,
              detail: a.destinatarios_tipo,
              url: createPageUrl("Announcements"),
              color: "text-purple-600",
              badge: a.prioridad
            });
          }
        });

        // Search payments (admin/coach only)
        if (isAdmin || isCoach) {
          const payments = await base44.entities.Payment.list();
          payments.forEach(p => {
            if (p.jugador_nombre.toLowerCase().includes(term) || 
                p.mes.toLowerCase().includes(term)) {
              newResults.payments.push({
                type: 'payment',
                icon: CreditCard,
                title: `Pago - ${p.jugador_nombre}`,
                subtitle: `${p.mes} ${p.temporada}`,
                detail: `${p.cantidad}€`,
                url: createPageUrl("Payments"),
                color: "text-green-600",
                badge: p.estado
              });
            }
          });
        }

        // Search callups
        const callups = await base44.entities.Convocatoria.list();
        callups.forEach(c => {
          if (c.titulo.toLowerCase().includes(term) || 
              c.categoria.toLowerCase().includes(term) ||
              c.rival?.toLowerCase().includes(term)) {
            newResults.callups.push({
              type: 'callup',
              icon: Bell,
              title: c.titulo,
              subtitle: `${c.categoria} - ${c.fecha_partido}`,
              detail: c.rival,
              url: isAdmin || isCoach ? createPageUrl("CoachCallups") : createPageUrl("ParentCallups"),
              color: "text-yellow-600",
              badge: c.tipo
            });
          }
        });

        setResults(newResults);
      } catch (error) {
        console.error("Search error:", error);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, isAdmin, isCoach]);

  const handleResultClick = (url) => {
    navigate(url);
    setSearchTerm("");
    setShowResults(false);
  };

  const allResults = [
    ...results.players,
    ...results.events,
    ...results.announcements,
    ...results.payments,
    ...results.callups
  ];

  const totalResults = allResults.length;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Buscar en todo el club..."
          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-white/60 hover:text-white" />
          </button>
        )}
      </div>

      {showResults && totalResults > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
          <Card className="absolute top-full mt-2 w-full lg:w-[600px] z-50 shadow-2xl max-h-[600px] overflow-hidden">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start border-b rounded-none p-2">
                  <TabsTrigger value="all" className="text-xs">
                    Todos ({totalResults})
                  </TabsTrigger>
                  {results.players.length > 0 && (
                    <TabsTrigger value="players" className="text-xs">
                      Jugadores ({results.players.length})
                    </TabsTrigger>
                  )}
                  {results.events.length > 0 && (
                    <TabsTrigger value="events" className="text-xs">
                      Eventos ({results.events.length})
                    </TabsTrigger>
                  )}
                  {results.announcements.length > 0 && (
                    <TabsTrigger value="announcements" className="text-xs">
                      Anuncios ({results.announcements.length})
                    </TabsTrigger>
                  )}
                  {results.payments.length > 0 && (
                    <TabsTrigger value="payments" className="text-xs">
                      Pagos ({results.payments.length})
                    </TabsTrigger>
                  )}
                  {results.callups.length > 0 && (
                    <TabsTrigger value="callups" className="text-xs">
                      Convocatorias ({results.callups.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="max-h-96 overflow-y-auto">
                  <TabsContent value="all" className="m-0 p-2">
                    <div className="space-y-1">
                      {allResults.slice(0, 10).map((result, idx) => {
                        const Icon = result.icon;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleResultClick(result.url)}
                            className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-3"
                          >
                            <Icon className={`w-5 h-5 ${result.color} mt-0.5 flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm text-slate-900 truncate flex-1">{result.title}</p>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {result.badge}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                              {result.detail && (
                                <p className="text-xs text-slate-400 truncate mt-0.5">{result.detail}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {['players', 'events', 'announcements', 'payments', 'callups'].map(tab => (
                    <TabsContent key={tab} value={tab} className="m-0 p-2">
                      <div className="space-y-1">
                        {results[tab].map((result, idx) => {
                          const Icon = result.icon;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleResultClick(result.url)}
                              className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-3"
                            >
                              <Icon className={`w-5 h-5 ${result.color} mt-0.5 flex-shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm text-slate-900 truncate flex-1">{result.title}</p>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {result.badge}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                                {result.detail && (
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{result.detail}</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}