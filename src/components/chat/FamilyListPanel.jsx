import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, User, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FamilyListPanel({
  conversations,
  families,
  players,
  categoria,
  user,
  onSelectConversation,
  onStartNewConversation,
  selectedConversationId
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Familias de esta categoría (pueden o no tener conversación activa)
  const familiesInCategory = useMemo(() => {
    if (!players || !categoria) return [];
    
    const categoryPlayers = players.filter(p => p.deporte === categoria && p.activo);
    const familyMap = new Map();
    
    categoryPlayers.forEach(player => {
      const familyEmail = player.email_padre;
      if (!familyEmail) return;
      
      if (!familyMap.has(familyEmail)) {
        familyMap.set(familyEmail, {
          email: familyEmail,
          nombre: player.email_padre, // Se puede mejorar buscando nombre real
          jugadores: []
        });
      }
      familyMap.get(familyEmail).jugadores.push({
        id: player.id,
        nombre: player.nombre
      });
    });
    
    return Array.from(familyMap.values());
  }, [players, categoria]);

  // Combinar conversaciones existentes con familias sin conversación
  const allItems = useMemo(() => {
    const items = [];
    
    // Primero agregar conversaciones existentes
    conversations.forEach(conv => {
      const family = familiesInCategory.find(f => f.email === conv.participante_familia_email);
      items.push({
        type: 'conversation',
        conversation: conv,
        family: family || { 
          email: conv.participante_familia_email, 
          nombre: conv.participante_familia_nombre,
          jugadores: conv.jugadores_relacionados || []
        },
        unreadCount: conv.no_leidos_staff || 0,
        lastMessageDate: conv.ultimo_mensaje_fecha
      });
    });
    
    // Luego agregar familias sin conversación
    familiesInCategory.forEach(family => {
      const hasConversation = conversations.some(c => 
        c.participante_familia_email === family.email
      );
      if (!hasConversation) {
        items.push({
          type: 'new',
          family,
          unreadCount: 0,
          lastMessageDate: null
        });
      }
    });
    
    // Ordenar: primero con mensajes no leídos, luego por fecha
    return items.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      if (a.lastMessageDate && b.lastMessageDate) {
        return new Date(b.lastMessageDate) - new Date(a.lastMessageDate);
      }
      if (a.lastMessageDate) return -1;
      if (b.lastMessageDate) return 1;
      return 0;
    });
  }, [conversations, familiesInCategory]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return allItems;
    const term = searchTerm.toLowerCase();
    return allItems.filter(item => 
      item.family.nombre?.toLowerCase().includes(term) ||
      item.family.email?.toLowerCase().includes(term) ||
      item.family.jugadores?.some(j => j.nombre?.toLowerCase().includes(term))
    );
  }, [allItems, searchTerm]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.no_leidos_staff || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-slate-900">Familias</h3>
            <p className="text-xs text-slate-600">{filteredItems.length} familias en {categoria}</p>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              {totalUnread} sin leer
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar familia o jugador..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay familias</p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = item.type === 'conversation' && item.conversation.id === selectedConversationId;
            
            return (
              <button
                key={item.type === 'conversation' ? item.conversation.id : `new-${item.family.email}`}
                onClick={() => {
                  if (item.type === 'conversation') {
                    onSelectConversation(item.conversation);
                  } else {
                    onStartNewConversation(item.family);
                  }
                }}
                className={`w-full p-4 flex items-center gap-3 border-b transition-all text-left ${
                  isSelected
                    ? 'bg-blue-100 border-l-4 border-l-blue-600'
                    : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.unreadCount > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200'
                }`}>
                  {item.type === 'new' ? (
                    <Plus className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 truncate">
                      {item.family.nombre || item.family.email?.split('@')[0]}
                    </span>
                    {item.type === 'new' && (
                      <Badge variant="outline" className="text-xs">Nuevo</Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-600 truncate">
                    👦 {item.family.jugadores?.map(j => j.nombre || j.jugador_nombre).join(", ") || "Sin jugadores"}
                  </div>
                  
                  {item.type === 'conversation' && item.conversation.ultimo_mensaje && (
                    <div className="text-xs text-slate-500 truncate mt-1">
                      {item.conversation.ultimo_mensaje_de === 'staff' ? '↩️ ' : ''}
                      {item.conversation.ultimo_mensaje}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {item.unreadCount > 0 && (
                    <Badge className="bg-blue-600 text-white text-xs h-6 min-w-6 rounded-full flex items-center justify-center">
                      {item.unreadCount}
                    </Badge>
                  )}
                  {item.lastMessageDate && (
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(item.lastMessageDate), "d MMM", { locale: es })}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}