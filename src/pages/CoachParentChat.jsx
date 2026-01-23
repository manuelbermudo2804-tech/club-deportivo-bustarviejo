import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Settings } from "lucide-react";
import CoachChatWindow from "../components/coach/CoachChatWindow";
import CoachAwayMode from "../components/coach/CoachAwayMode";

export default function CoachParentChat({ embedded = false }) {
  const [user, setUser] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadByCategory, setUnreadByCategory] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const categories = currentUser.role === "admin" 
        ? ["Todas las categorías"]
        : (currentUser.categorias_entrena || []);
      
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      const players = await base44.entities.Player.list();
      setAllPlayers(players);
    };
    fetchPlayers();
  }, []);

  // Contar mensajes no leídos por categoría (desde ChatMessage)
  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessagesAll'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 1000),
    initialData: [],
    staleTime: 20000,
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!messages || !user) return;

    const coachCats = user?.categorias_entrena || [];
    const isAdminUser = user?.role === "admin";
    const unreadCounts = {};

    messages.forEach(msg => {
      const catKey = msg.deporte || msg.grupo_id;
      if (!catKey) return;

      // Padres -> Entrenador: badge para entrenador (sin leído por el entrenador)
      if (msg.tipo === 'padre_a_grupo') {
        const isRead = msg.leido_por?.some(lp => lp.email === user.email);
        if (isRead) return;
        
        // Admin ve todos, entrenador solo sus categorías
        if (isAdminUser || coachCats.includes(catKey)) {
          unreadCounts[catKey] = (unreadCounts[catKey] || 0) + 1;
        }
      }
    });

    setUnreadByCategory(unreadCounts);
  }, [messages, user]);

  // Marcar no leídos de la categoría abierta como leídos (padre_a_grupo) usando leido_por
  // Si hay ?category= en la URL, abrir directamente esa pestaña
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat && !selectedCategory) setSelectedCategory(cat);
  }, [selectedCategory]);
  useEffect(() => {
    if (!selectedCategory || !messages?.length || !user) return;
    const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
    const unread = messages.filter(m => 
      m.tipo === 'padre_a_grupo' && 
      (m.grupo_id === grupo_id || m.deporte === selectedCategory) &&
      (!m.leido_por || !m.leido_por.some(lp => lp.email === user.email))
    );
    
    if (unread.length === 0) return;
    
    (async () => {
      try {
        for (const msg of unread.slice(0, 10)) {
          const leidoPor = Array.isArray(msg.leido_por) ? [...msg.leido_por] : [];
          leidoPor.push({ email: user.email, nombre: user.full_name, fecha: new Date().toISOString() });
          await base44.entities.ChatMessage.update(msg.id, { leido: true, leido_por: leidoPor });
        }
      } catch (e) {
        console.log('Error marcando mensajes como leídos:', e);
      }
    })();
  }, [selectedCategory, messages, user]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const isCoach = user?.es_entrenador === true || user?.role === "admin";

  if (!isCoach) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo entrenadores pueden acceder a esta sección</p>
      </div>
    );
  }

  const categories = user?.role === "admin" 
    ? ["Todas las categorías", ...new Set(allPlayers.map(p => p.deporte).filter(Boolean))]
    : (user?.categorias_entrena || []);

  if (categories.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes categorías asignadas. Contacta con el administrador.</p>
      </div>
    );
  }

  if (embedded) {
    return (
      <>
        {/* Modal de configuración */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                ⚙️ Configuración Chat Entrenador
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              <CoachAwayMode user={user} />
            </div>
          </DialogContent>
        </Dialog>

        <Card className="h-full flex flex-col overflow-hidden border-green-200 shadow-lg rounded-none">
          {/* Header con pestañas de categorías */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
            <div className="p-2 flex items-center justify-between border-b border-green-500/30">
              <div>
                <h1 className="text-base font-bold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat con Familias
                </h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          
          {/* Pestañas de categorías - más compactas */}
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
            {categories.map(cat => {
              const catKey = typeof cat === 'string' ? cat : (cat?.nombre || String(cat));
              const categoryPlayers = cat === "Todas las categorías" 
                ? allPlayers 
                : allPlayers.filter(p => p.deporte === cat);
              
              const parentCount = new Set(categoryPlayers.flatMap(p => 
                [p.email_padre, p.email_tutor_2].filter(Boolean)
              )).size;

              const unreadCount = unreadByCategory[cat] || 0;

              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap text-xs px-2 py-1 h-7 relative ${
                    selectedCategory === cat 
                      ? 'bg-white text-green-700 hover:bg-white/90' 
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  {cat === "Todas las categorías" ? "📋 Todas" : catKey.replace?.('Fútbol ', '').replace?.(' (Mixto)', '') || String(catKey)}
                  <span className="ml-1.5 text-xs opacity-70">({parentCount})</span>
                  {unreadCount > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Ventana de chat */}
        <div className="flex-1 overflow-hidden min-h-0">
          {selectedCategory && (unreadByCategory[selectedCategory] > 0) && (
            <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-xs px-3 py-2">
              Tienes {unreadByCategory[selectedCategory]} mensajes nuevos en {selectedCategory}
            </div>
          )}
          {selectedCategory ? (
            <CoachChatWindow
              selectedCategory={selectedCategory}
              user={user}
              allPlayers={allPlayers}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Selecciona una categoría para empezar</p>
              </div>
            </div>
          )}
        </div>
      </Card>
      </>
    );
  }

  return (
    <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0">
      {/* Modal de configuración */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              ⚙️ Configuración Chat Entrenador
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <CoachAwayMode user={user} />
          </div>
        </DialogContent>
      </Dialog>

      <Card className="h-full flex flex-col overflow-hidden lg:rounded-lg rounded-none border-green-200 shadow-lg">
        {/* Header con pestañas de categorías */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
          <div className="p-2 flex items-center justify-between border-b border-green-500/30">
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Chat con Familias
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        
        {/* Pestañas de categorías - más compactas */}
        <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {categories.map(cat => {
            const categoryPlayers = cat === "Todas las categorías" 
              ? allPlayers 
              : allPlayers.filter(p => p.deporte === cat);
            
            const parentCount = new Set(categoryPlayers.flatMap(p => 
              [p.email_padre, p.email_tutor_2].filter(Boolean)
            )).size;

            const unreadCount = unreadByCategory[cat] || 0;

            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap text-xs px-2 py-1 h-7 relative ${
                  selectedCategory === cat 
                    ? 'bg-white text-green-700 hover:bg-white/90' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                {cat === "Todas las categorías" ? "📋 Todas" : cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                <span className="ml-1.5 text-xs opacity-70">({parentCount})</span>
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Ventana de chat */}
      <div className="flex-1 overflow-hidden min-h-0">
        {selectedCategory && (unreadByCategory[selectedCategory] > 0) && (
          <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-xs px-3 py-2">
            Tienes {unreadByCategory[selectedCategory]} mensajes nuevos en {selectedCategory}
          </div>
        )}
        {selectedCategory ? (
          <CoachChatWindow
            selectedCategory={selectedCategory}
            user={user}
            allPlayers={allPlayers}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Selecciona una categoría para empezar</p>
            </div>
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}