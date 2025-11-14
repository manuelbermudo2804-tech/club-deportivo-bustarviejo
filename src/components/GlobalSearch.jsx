import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Search, X, User, Calendar, Megaphone, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GlobalSearch({ isAdmin, isCoach }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchData = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      const term = searchTerm.toLowerCase();
      const allResults = [];

      try {
        // Search players
        const players = await base44.entities.Player.list();
        players.forEach(p => {
          if (p.nombre.toLowerCase().includes(term) || p.email_padre?.toLowerCase().includes(term)) {
            allResults.push({
              type: 'player',
              icon: User,
              title: p.nombre,
              subtitle: p.deporte,
              url: isAdmin ? createPageUrl("Players") : createPageUrl("ParentPlayers"),
              color: "text-orange-600"
            });
          }
        });

        // Search events
        const events = await base44.entities.Event.list();
        events.forEach(e => {
          if (e.titulo.toLowerCase().includes(term) || e.descripcion?.toLowerCase().includes(term)) {
            allResults.push({
              type: 'event',
              icon: Calendar,
              title: e.titulo,
              subtitle: `${e.tipo} - ${e.fecha}`,
              url: createPageUrl("Calendar"),
              color: "text-blue-600"
            });
          }
        });

        // Search announcements
        const announcements = await base44.entities.Announcement.list();
        announcements.forEach(a => {
          if (a.titulo.toLowerCase().includes(term) || a.contenido?.toLowerCase().includes(term)) {
            allResults.push({
              type: 'announcement',
              icon: Megaphone,
              title: a.titulo,
              subtitle: a.prioridad,
              url: createPageUrl("Announcements"),
              color: "text-purple-600"
            });
          }
        });

        // Search payments (admin only)
        if (isAdmin || isCoach) {
          const payments = await base44.entities.Payment.list();
          payments.forEach(p => {
            if (p.jugador_nombre.toLowerCase().includes(term)) {
              allResults.push({
                type: 'payment',
                icon: CreditCard,
                title: `Pago - ${p.jugador_nombre}`,
                subtitle: `${p.mes} ${p.temporada} - ${p.estado}`,
                url: createPageUrl("Payments"),
                color: "text-green-600"
              });
            }
          });
        }

        setResults(allResults.slice(0, 8));
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
          placeholder="Buscar jugadores, eventos, anuncios..."
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

      {showResults && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
          <Card className="absolute top-full mt-2 w-full z-50 shadow-2xl max-h-96 overflow-y-auto">
            <CardContent className="p-2">
              <div className="space-y-1">
                {results.map((result, idx) => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleResultClick(result.url)}
                      className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3"
                    >
                      <Icon className={`w-5 h-5 ${result.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{result.title}</p>
                        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {result.type === 'player' ? 'Jugador' : 
                         result.type === 'event' ? 'Evento' : 
                         result.type === 'announcement' ? 'Anuncio' : 'Pago'}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}